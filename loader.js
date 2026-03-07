let percent = 0;
const progressRing = document.querySelector(".progress-ring");
const percentText = document.getElementById("percent");
const loader = document.getElementById("loader");
const loaderMessage = document.getElementById("loader-message");

const circumference = 2 * Math.PI * 90;
progressRing.style.strokeDasharray = circumference;

const messages = [
  "Connecting to 5G network...",
  "Loading fresh ingredients...",
  "Preparing digital kitchen...",
  "Establishing secure connection...",
  "Calibrating flavor algorithms...",
  "Syncing with satellite...",
  "Optimizing delivery routes...",
  "Warming up servers...",
  "Almost ready..."
];

function setProgress(p) {
  const offset = circumference - (p / 100) * circumference;
  progressRing.style.strokeDashoffset = offset;
}

function updateMessage(p) {
  if (!loaderMessage) return;
  const messageIndex = Math.floor((p / 100) * messages.length);
  loaderMessage.textContent = messages[Math.min(messageIndex, messages.length - 1)];
}

const interval = setInterval(() => {
  percent += Math.floor(Math.random() * 4) + 2;
  
  if (percent >= 100) {
    percent = 100;
    clearInterval(interval);
    
    updateMessage(percent);
    setProgress(percent);
    percentText.textContent = "100%";
    
    setTimeout(() => {
      loader.classList.add("fade-out");
    }, 500);
    
    setTimeout(() => {
      sessionStorage.setItem('splashShown', 'true');
    }, 1200);
    
    return;
  }
  
  percentText.textContent = percent + "%";
  setProgress(percent);
  updateMessage(percent);
}, 100);