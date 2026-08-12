const SAMPLE = {
  original: `Hello Maya —\n\nThank you so much for reaching out. Thursday at 3 works perfectly for me, and I would be more than happy to send over the product deck in advance of our scheduled conversation.\n\nWarmly,\nYunus`,
  correction: `Hi Maya,\n\nThursday at 3 works. I'll send the deck before the call.\n\nBest,\nYunus`
};
const NEXT_EMAIL = { recipient: "Leo", facts: ["42 teams are in the beta.", "Source-linked suggestions ship next week."] };
const BASELINE_SECOND = `Hello Leo —\n\nThank you so much for reaching out. I'm pleased to share that 42 teams are in the beta, and source-linked suggestions ship next week.\n\nWarmly,\nYunus`;
const STORAGE_KEY = "scape-preference-memory-v2";
const $ = (id) => document.getElementById(id);
const state = { stage: 1, memory: emptyMemory(), dirty: false };
let toastTimer;

function emptyMemory() { return { version: 2, editCount: 0, edits: [], preferences: {} }; }
function cleanLines(text) { return String(text || "").replace(/\r/g, "").split("\n").map((line) => line.trim()); }
function words(text) { return String(text || "").trim().split(/\s+/).filter(Boolean); }
function hashText(text) { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
function greetingOf(text) { return cleanLines(text).find(Boolean)?.match(/^(Hey|Hi|Hello)\b/i)?.[1] || null; }
function signoffOf(text) { const lines = cleanLines(text).filter(Boolean); const candidate = lines.at(-2)?.replace(/,$/, ""); return /^(Best|Thanks|Cheers|Warmly|Regards)$/i.test(candidate || "") ? candidate : null; }
function bodyOf(text) { const lines = cleanLines(text).filter(Boolean); return (signoffOf(text) ? lines.slice(1, -2) : lines.slice(1)).join(" "); }
function sentenceLengths(text) { return bodyOf(text).split(/[.!?]+/).map((part) => words(part).length).filter(Boolean); }

function extractObservations(original, correction, editId = hashText(correction)) {
  const originalWords = words(original).length, correctedWords = words(correction).length;
  if (correctedWords < 5 || !/[.!?]/.test(correction)) return { editId, valid: false, reason: "Write a complete reply before teaching Scape.", observations: [] };
  const observations = [], greeting = greetingOf(correction), originalGreeting = greetingOf(original), signoff = signoffOf(correction), originalSignoff = signoffOf(original);
  if (greeting) observations.push({ id: "greeting", label: "Greeting", value: greeting, detail: `${originalGreeting || "none"} → ${greeting}` });
  if (signoff) observations.push({ id: "signoff", label: "Sign-off", value: signoff, detail: `${originalSignoff || "none"} → ${signoff}` });
  observations.push({ id: "length", label: "Response length", value: correctedWords / Math.max(1, originalWords) <= .72 ? "Keep it brief" : "Keep useful detail", detail: `${originalWords} → ${correctedWords} words` });
  const fillers = ["thank you so much", "more than happy", "works perfectly"], removed = fillers.filter((phrase) => original.toLowerCase().includes(phrase) && !correction.toLowerCase().includes(phrase));
  if (removed.length) observations.push({ id: "directness", label: "Tone", value: "Direct, no filler", detail: `${removed.length} filler phrase${removed.length === 1 ? "" : "s"} removed` });
  if (/[—–]/.test(original) && !/[—–]/.test(correction)) observations.push({ id: "dash", label: "Punctuation", value: "Avoid em dashes", detail: "Dash removed where one was available" });
  const pairs = [[/\bI will\b/i, /\bI'll\b/i], [/\bwe will\b/i, /\bwe'll\b/i], [/\bI am\b/i, /\bI'm\b/i]];
  if (pairs.some(([long, short]) => long.test(original) && short.test(correction))) observations.push({ id: "contraction", label: "Voice", value: "Use contractions", detail: "Formal phrase shortened in the edit" });
  return { editId, valid: true, originalWords, correctedWords, observations };
}

function preferenceStatus(candidates) {
  const ranked = Object.entries(candidates).sort((a,b) => b[1].support - a[1].support), total = ranked.reduce((sum, [,v]) => sum + v.support, 0), lead = ranked[0]?.[1].support || 0, runner = ranked[1]?.[1].support || 0;
  if (ranked.length > 1 && lead - runner < 2) return { status: "conflicted", badge: `Mixed evidence · ${total} examples` };
  if (lead >= 3 && lead - runner >= 2) return { status: "learned", badge: `Learned · ${lead} examples` };
  if (lead >= 2) return { status: "reinforced", badge: `Reinforced · ${lead} examples` };
  return { status: "observed", badge: "Observed once · provisional" };
}

function mergeMemory(memory, result) {
  const next = JSON.parse(JSON.stringify(memory || emptyMemory()));
  if (!result.valid || next.edits.includes(result.editId)) return next;
  next.edits.push(result.editId); next.editCount += 1;
  for (const observation of result.observations) {
    const pref = next.preferences[observation.id] || { id: observation.id, label: observation.label, candidates: {} }, candidate = pref.candidates[observation.value] || { support: 0, evidence: [] };
    candidate.support += 1; candidate.evidence.push({ editId: result.editId, detail: observation.detail }); pref.candidates[observation.value] = candidate;
    const ranked = Object.entries(pref.candidates).sort((a,b) => b[1].support - a[1].support); pref.value = ranked[0][0]; pref.detail = ranked[0][1].evidence.at(-1).detail;
    Object.assign(pref, preferenceStatus(pref.candidates)); next.preferences[observation.id] = pref;
  }
  return next;
}

function applicable(memory, id) { const pref = memory.preferences[id]; return pref && pref.status !== "conflicted" ? pref.value : null; }
function buildPersonalizedDraft(plan, memory) {
  const greeting = applicable(memory,"greeting") || "Hello", signoff = applicable(memory,"signoff") || "Warmly", brief = applicable(memory,"length") === "Keep it brief", direct = applicable(memory,"directness") === "Direct, no filler", avoidDash = applicable(memory,"dash") === "Avoid em dashes";
  const facts = plan.facts.join(brief ? " " : " Also, "), body = direct ? facts : `Thanks for checking in. ${facts}`;
  return `${greeting} ${plan.recipient}${avoidDash ? "," : " —"}\n\n${body}\n\n${signoff},\nYunus`;
}

function diffTokens(original, correction) {
  const a=words(original), b=words(correction), matrix=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++) matrix[i][j]=a[i-1]===b[j-1]?matrix[i-1][j-1]+1:Math.max(matrix[i-1][j],matrix[i][j-1]);
  const removed=[],added=[];let i=a.length,j=b.length;while(i||j){if(i&&j&&a[i-1]===b[j-1]){i--;j--;}else if(j&&(!i||matrix[i][j-1]>=matrix[i-1][j]))added.unshift(b[--j]);else removed.unshift(a[--i]);}return{removed,added};
}

function showToast(message){const toast=$("toast");toast.textContent=message;toast.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("show"),1900);}
function updateMemoryCount(){const count=Object.keys(state.memory.preferences).length;$("memoryCount").textContent=count;$("memoryLabel").textContent=count===1?"signal remembered":"signals remembered";}
function setStage(number){state.stage=number;document.querySelectorAll(".stage-view").forEach(v=>v.classList.add("hidden"));({1:$("correctionView"),2:$("memoryView"),3:$("transferView")})[number].classList.remove("hidden");document.querySelectorAll(".stage").forEach(button=>{const value=Number(button.dataset.stage);button.classList.toggle("active",value===number);button.classList.toggle("complete",value<number);button.setAttribute("aria-current",value===number?"step":"false");});const titles={1:["STEP 1 · CORRECTION","Edit one draft"],2:["STEP 2 · SIGNALS","See what changed"],3:["STEP 3 · TRANSFER","See the next starting point"]};$("stageKicker").textContent=titles[number][0];$("stageTitle").textContent=titles[number][1];$("secondMailButton").disabled=number<3;$("secondMailButton").classList.toggle("locked",number<3);}
function updateStats(){const correction=$("correctedDraft").value,originalCount=words(SAMPLE.original).length,correctionCount=words(correction).length,lengths=sentenceLengths(correction);$("wordDelta").textContent=`${correctionCount-originalCount<0?"−":"+"}${Math.abs(correctionCount-originalCount)} words`;$("sentenceStat").textContent=`${lengths.length} sentence${lengths.length===1?"":"s"} · ${lengths.length?Math.round(lengths.reduce((a,b)=>a+b,0)/lengths.length):0} words avg`;if(state.dirty)$("savedState").textContent="changes not observed";}
function make(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function renderMemory(result){const prefs=Object.values(state.memory.preferences);updateMemoryCount();$("memoryPulse").classList.add("active");$("memoryHeadline").textContent=`${result.observations.length} writing signals found in this edit.`;const grid=$("preferenceGrid");grid.replaceChildren();prefs.forEach((rule,index)=>{const card=make("article","preference-card");card.style.setProperty("--delay",`${index*55}ms`);const icon=make("div","preference-icon",["Aa","↔","✦","⌁","—","’"][index]||"✓"),copy=make("div");copy.append(make("span",null,rule.label),make("b",null,rule.value),make("small",null,rule.detail));card.append(icon,copy,make("em",rule.status,rule.badge));grid.append(card);});const diff=diffTokens(SAMPLE.original,$("correctedDraft").value),lines=$("diffLines");lines.replaceChildren();[["−","removed",diff.removed],["+","added",diff.added]].forEach(([symbol,cls,tokens])=>{const p=make("p",cls),mark=make("span",null,symbol),copy=make("span",null,tokens.slice(0,15).join(" ")+(tokens.length>15?"…":""));p.append(mark,copy);lines.append(p);});}
function renderTransfer(){const personalized=buildPersonalizedDraft(NEXT_EMAIL,state.memory);$("baselineDraft").textContent=BASELINE_SECOND;$("personalizedDraft").textContent=personalized;const rules=Object.values(state.memory.preferences).filter(p=>p.status!=="conflicted"),container=$("appliedRules");container.replaceChildren(...rules.map(rule=>make("span",null,`✓ ${rule.value} · ${rule.status}`)));const factsKept=NEXT_EMAIL.facts.every(f=>personalized.toLowerCase().includes(f.toLowerCase()));$("resultSummary").textContent=`${rules.length} provisional signals applied · ${factsKept?"requested facts retained":"review facts"}.`;}
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.memory));}catch{}}
function learn(){const result=extractObservations(SAMPLE.original,$("correctedDraft").value);if(!result.valid){showToast(result.reason);return;}const before=state.memory.editCount;state.memory=mergeMemory(state.memory,result);state.dirty=false;persist();renderMemory(result);setStage(2);$("savedState").textContent=state.memory.editCount===before?"already observed":"added as one example";showToast(state.memory.editCount===before?"This edit was already observed":`${result.observations.length} signals added`);}
function hydrate(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));if(parsed?.version===2)state.memory=parsed;}catch{}updateMemoryCount();if(state.memory.editCount)$("memoryPulse").classList.add("active");}

if(typeof document!=="undefined"){$("correctedDraft").addEventListener("input",()=>{state.dirty=true;updateStats();setStage(1);});$("learnButton").addEventListener("click",learn);$("nextEmailButton").addEventListener("click",()=>{renderTransfer();setStage(3);});$("secondMailButton").addEventListener("click",()=>{if(state.memory.editCount&&!state.dirty){renderTransfer();setStage(3);}});$("backToEditButton").addEventListener("click",()=>setStage(1));$("resetButton").addEventListener("click",()=>{$("correctedDraft").value=SAMPLE.correction;state.memory=emptyMemory();state.dirty=false;try{localStorage.removeItem(STORAGE_KEY);}catch{}$("memoryPulse").classList.remove("active");updateMemoryCount();updateStats();setStage(1);showToast("Demo reset");});document.querySelectorAll(".stage").forEach(button=>button.addEventListener("click",()=>{const target=Number(button.dataset.stage);if(target===1)setStage(1);if(target===2&&state.memory.editCount&&!state.dirty)setStage(2);if(target===3&&state.memory.editCount&&!state.dirty){renderTransfer();setStage(3);}}));hydrate();updateStats();setStage(1);}
globalThis.ScapePreferenceEngine={emptyMemory,extractObservations,mergeMemory,buildPersonalizedDraft,diffTokens,preferenceStatus,sample:SAMPLE,nextEmail:NEXT_EMAIL,baselineSecond:BASELINE_SECOND};
