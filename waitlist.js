// Modern bekleme listesi formu (Vanilla JS + Fetch API)
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('waitlist-form');
  const msg = document.getElementById('waitlist-msg');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    msg.textContent = '';
    const data = {
      email: form.email.value,
      phone: form.phone.value,
      name: form.name.value,
      referral: form.referral.value
    };
    try {
      const res = await fetch('http://localhost:3001/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.success) {
        form.reset();
        msg.textContent = 'Başarıyla kaydoldunuz!';
        msg.className = 'success';
      } else {
        msg.textContent = result.error || 'Bir hata oluştu.';
        msg.className = 'error';
      }
    } catch (err) {
      msg.textContent = 'Sunucuya ulaşılamıyor.';
      msg.className = 'error';
    }
  });
});
