// AOS Animasyonları
AOS.init({
  duration: 1000,
  easing: 'ease-in-out',
  once: true,
});

// Sayım Animasyonu
const counterElement = document.getElementById('counter');
let counterValue = 0;
const targetValue = 1234; // Gerçek sayı buraya gelebilir (API'den vs)

const updateCounter = () => {
  if (counterValue < targetValue) {
    counterValue += 1;
    counterElement.textContent = counterValue;
    setTimeout(updateCounter, 20);
  }
};

// Sayfa yüklendiğinde başlat
window.onload = updateCounter;

// Waitlist formu
document.getElementById('waitlist-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const email = this.email.value;
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValidEmail) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('notification').style.display = 'none';
    return;
  }

  // Form gönder
  fetch(this.action, {
    method: 'POST',
    body: new FormData(this),
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(() => {
    document.getElementById('notification').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    this.reset();
  })
  .catch(() => {
    alert('Bir hata oluştu. Lütfen tekrar deneyin.');
  });
});
