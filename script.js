const body = document.body;
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('.main-nav a')];
const header = document.querySelector('.site-header');
const progress = document.querySelector('.scroll-progress');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const open = body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

navLinks.forEach(link => {
  link.addEventListener('click', () => {
    body.classList.remove('nav-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

function updateScrollUi() {
  if (header) header.classList.toggle('scrolled', window.scrollY > 12);
  if (progress) {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = scrollable > 0 ? `${(window.scrollY / scrollable) * 100}%` : '0%';
  }

  const sections = ['project', 'process', 'impact', 'partnership', 'team', 'contact'];
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 140) current = id;
  });

  navLinks.forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

window.addEventListener('scroll', updateScrollUi);
window.addEventListener('load', updateScrollUi);

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const capacityInput = document.getElementById('capacityInput');
const hoursInput = document.getElementById('hoursInput');
const capacityValue = document.getElementById('capacityValue');
const hoursValue = document.getElementById('hoursValue');
const volumeResult = document.getElementById('volumeResult');
const energyResult = document.getElementById('energyResult');
const isCzech = document.documentElement.lang === 'cs';

function formatNum(value, decimals = 0) {
  return new Intl.NumberFormat(isCzech ? 'cs-CZ' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

function updateCalculator() {
  if (!capacityInput || !hoursInput) return;
  const capacity = Number(capacityInput.value);
  const hours = Number(hoursInput.value);
  const annualVolume = capacity * hours;
  const energyGWh = annualVolume * 10.6 / 1_000_000;

  capacityValue.textContent = `${formatNum(capacity)} Nm³/h`;
  hoursValue.textContent = `${formatNum(hours)} h`;

  if (isCzech) {
    volumeResult.textContent = `${formatNum(annualVolume / 1_000_000, 1)} mil. Nm³`;
    energyResult.textContent = `${formatNum(energyGWh, 1)} GWh`;
  } else {
    volumeResult.textContent = `${formatNum(annualVolume / 1_000_000, 1)}m Nm³`;
    energyResult.textContent = `${formatNum(energyGWh, 1)} GWh`;
  }
}

capacityInput?.addEventListener('input', updateCalculator);
hoursInput?.addEventListener('input', updateCalculator);
updateCalculator();

const copyBtn = document.querySelector('.copy-btn');
copyBtn?.addEventListener('click', async () => {
  const email = copyBtn.dataset.copy;
  const original = copyBtn.textContent;
  try {
    await navigator.clipboard.writeText(email);
    copyBtn.textContent = isCzech ? 'Zkopírováno' : 'Copied';
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1500);
  } catch {
    window.location.href = `mailto:${email}`;
  }
});

const form = document.getElementById('contactForm');
form?.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const topic = data.get('topic');

  const subject = encodeURIComponent(isCzech ? `ZK nextgen energy – ${topic}` : `ZK nextgen energy inquiry – ${topic}`);
  const bodyText = isCzech
    ? `Jméno: ${data.get('name')}\nE-mail: ${data.get('email')}\nTéma: ${topic}\n\nZpráva:\n${data.get('message')}`
    : `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nTopic: ${topic}\n\nMessage:\n${data.get('message')}`;

  window.location.href = `mailto:kvapil.develop@gmail.com?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
});

document.getElementById('year').textContent = new Date().getFullYear();
