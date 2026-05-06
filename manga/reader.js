const pages = [
  "pages/001.jpg",
  "pages/002.jpg",
  "pages/003.jpg",
  "pages/004.jpg",
  "pages/005.jpg",
];

let current = 0;

const img = document.getElementById("page");
const indicator = document.getElementById("page-indicator");

function updatePage() {
  img.src = pages[current];
  indicator.innerText = `${current + 1} / ${pages.length}`;

  // preload next
  if (pages[current + 1]) {
    const preload = new Image();
    preload.src = pages[current + 1];
  }
}

function nextPage() {
  if (current < pages.length - 1) {
    current++;
    updatePage();
  }
}

function prevPage() {
  if (current > 0) {
    current--;
    updatePage();
  }
}

function exitReader() {
  window.history.back();
}

/* SWIPE SUPPORT */
let startX = 0;

document.getElementById("viewer").addEventListener("touchstart", e => {
  startX = e.touches[0].clientX;
});

document.getElementById("viewer").addEventListener("touchend", e => {
  let endX = e.changedTouches[0].clientX;

  if (startX - endX > 50) nextPage();
  if (endX - startX > 50) prevPage();
});

updatePage();
