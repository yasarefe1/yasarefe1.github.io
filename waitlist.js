// waitlist.js

document.getElementById("waitlist-form").addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("waitlist-email").value.trim();
  const messageBox = document.getElementById("waitlist-message");
  const btn = document.querySelector("#waitlist-form button");
  const input = document.getElementById("waitlist-email");

  // 1. Formun dolu olup olmadığı  if (!email.includes("@") || !email.includes(".")) {
    showMessage(messageBox, "❌ Lütfen geçerli bir e-posta girin.", "red");
    return;
  }

  // 2. Bekleme efekti
  btn.disabled = true;
  btn.textContent = "İşleniyor...";

  // 3. Emaili sana göndermek için (kendi maile gönderelim!)
  const formData = new FormData();
  formData.append("email", email);

  try {
    // 🔗 AŞAĞIDA KENDİ E-POSTA API ADRESİNLE DEĞİŞTİR!
    // Örneğin: https://us-central1-projen-adin.cloudfunctions.net/addToWaitlist
    // VEYA: https://api.yoursite.com/waitlist
    const res = await fetch("https://your-own-api.com/waitlist", {
      method: "POST",
      body: JSON.stringify({ email: email }),
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      showMessage(messageBox, "✅ Kaydoldun! Sizden haber alacağız.", "#5a67d8");
      input.value = "";
    } else {
      showMessage(messageBox, "❌ Bir hata oluştu, lütfen daha sonra tekrar dene.", "red");
    }
  } catch (err) {
    showMessage(messageBox, "⚠️ Bağlantı hatası. İnternetinizi kontrol edin.", "red");
  } finally {
    btn.disabled = false;
    btn.textContent = "Katıl";
  }
});

function showMessage(box, text, color) {
  box.style.color = color;
  box.textContent = text;
  box.style.display = "block";
  setTimeout(() => (box.style.display = "none"), 7000);
}
