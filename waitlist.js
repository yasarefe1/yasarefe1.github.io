// waitlist.js - Form işleme (isteğe bağlı ama profesyonel)

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("form");
  const msg = document.getElementById("waitlist-message");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const btn = form.querySelector("button");
    const email = form.querySelector("input").value.trim();

    // 1. Doğrulama
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showMessage("❌ Geçerli bir e-posta gir.", "red");
      return;
    }

    // 2. Bekleme
    btn.textContent = "İşleniyor...";
    btn.disabled = true;

    // 3. Netlify'e gönder
    const formData = new FormData(form);
    fetch("/", {
      method: "POST",
      headers: { "Accept": "application/json" },
      body: formData
    })
      .then(res => {
        if (res.ok) {
          showMessage("✅ Kaydoldun! Sizden haber alacağız.", "#5a67d8");
          form.reset();
        } else {
          res.json().then(d => {
            showMessage(
              d.error && d.error.includes("duplicate")
                ? "❌ Zaten kayıtlısın!"
                : "❌ Bir hata oluştu.",
              "red"
            );
          });
        }
      })
      .catch(() => {
        showMessage("⚠️ Bağlantı hatası.", "red");
      })
      .finally(() => {
        btn.textContent = "Katıl";
        btn.disabled = false;
      });
  });

  function showMessage(text, color) {
    msg.style.color = color;
    msg.textContent = text;
    setTimeout(() => { msg.textContent = ""; }, 7000);
  }
});
