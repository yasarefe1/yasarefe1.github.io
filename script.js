// AOS başlat
AOS.init({
  duration: 1000,
  easing: 'ease-in-out',
  once: true,
});

// Sayacı localStorage'dan al veya sıfırla
let counterValue = parseInt(localStorage.getItem('waitlistCount')) || 0;
const counterElement = document.getElementById('counter');

// Sayacı animasyonlu yükseltme
const animateCounter = (start, end) => {
  let current = start;
  const increment = Math.ceil((end - start) / 50);

  const timer = setInterval(() => {
    current += increment;
    if (current >= end) {
      current = end;
      clearInterval(timer);
    }
    counterElement.textContent = current;
  }, 20);
};

// Sayacı güncelle
const updateCounterDisplay = () => {
  if (counterValue > 0) {
    animateCounter(counterValue - 1, counterValue);
  } else {
    counterElement.textContent = counterValue;
  }
};

// Sayfa yüklendiğinde göster
window.onload = updateCounterDisplay;

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

  // Form gönder (AJAX ile, sayfa yenilenmeden)
  fetch(this.action, {
    method: 'POST',
    body: new FormData(this),
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (response.ok) {
      // Sayacı artır
      counterValue += 1;
      localStorage.setItem('waitlistCount', counterValue);
      animateCounter(counterValue - 1, counterValue); // Ekranı animasyonlu güncelle

      document.getElementById('notification').style.display = 'block';
      document.getElementById('error').style.display = 'none';
      this.reset();
    } else {
      throw new Error('Form gönderilemedi');
    }
  })
  .catch(error => {
    alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    console.error('Hata:', error);
  });
});
