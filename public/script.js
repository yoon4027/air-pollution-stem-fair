const heartColors = ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎"];

function createHeart() {
  const heart = document.createElement("div");

  const randomHeart =
    heartColors[Math.floor(Math.random() * heartColors.length)];

  heart.textContent = randomHeart;
  heart.classList.add("falling-heart");

  heart.style.left = Math.random() * 100 + "vw";

  heart.style.animationDuration = Math.random() * 3 + 2 + "s";

  heart.style.opacity = Math.random() * 0.5 + 0.5;

  document.body.appendChild(heart);

  heart.addEventListener("animationend", () => {
    heart.remove();
  });
}

setInterval(createHeart, 300);
