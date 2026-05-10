const pages = [
  "pages/001.jpg",
  "pages/002.jpg",
  "pages/003.jpg",
  "pages/004.jpg",
  "pages/005.jpg",
  "pages/006.jpg",
  "pages/007.jpg",
  "pages/008.jpg",
  "pages/009.jpg",
  "pages/010.jpg",
  "pages/011.jpg",
  "pages/012.jpg"
];

let current = 0;

const img = document.getElementById("page");
const pageDiv = document.getElementById("page-container");
const indicator = document.getElementById("page-indicator");

/* UPDATE PAGE */
function updatePage() {
  img.src = pages[current];
  indicator.innerText = `${current + 1} / ${pages.length}`;

  // preload next page
  if (pages[current + 1]) {
    const preload = new Image();
    preload.src = pages[current + 1];
  }
}

/* PAGE TURN */
function turnPage(direction) {
  pageDiv.classList.add("turn");

  setTimeout(() => {
    if (direction === "next" && current < pages.length - 1) {
      current++;
    } else if (direction === "prev" && current > 0) {
      current--;
    }

    updatePage();
    pageDiv.classList.remove("turn");
  }, 300);
}

function nextPage() {
  turnPage("next");
}

function prevPage() {
  turnPage("prev");
}

function exitReader() {
  window.history.back();
}

/* SWIPE SUPPORT */
let startX = 0;

const book = document.getElementById("book");

book.addEventListener("touchstart", (e) => {
  startX = e.touches[0].clientX;
});

book.addEventListener("touchend", (e) => {
  const endX = e.changedTouches[0].clientX;

  if (startX - endX > 50) nextPage();
  if (endX - startX > 50) prevPage();
});

/* INIT */
updatePage();
