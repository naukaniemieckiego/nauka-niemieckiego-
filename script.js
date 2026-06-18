const lessons = [
  {
    name: "A1: Przedstawianie się",
    items: [
      { de: "Ich heiße Anna.", pl: "Nazywam się Anna." },
      { de: "Wie heißt du?", pl: "Jak się nazywasz?" },
      { de: "Ich komme aus Polen.", pl: "Pochodzę z Polski." },
      { de: "Ich wohne in Heidelberg.", pl: "Mieszkam w Heidelbergu." }
    ]
  },
  {
    name: "A1: Rodzina i wiek",
    items: [
      { de: "Wie alt bist du?", pl: "Ile masz lat?" },
      { de: "Ich bin sechsundvierzig Jahre alt.", pl: "Mam 46 lat." },
      { de: "Das ist meine Familie.", pl: "To jest moja rodzina." },
      { de: "Ich bin verheiratet.", pl: "Jestem mężatką." }
    ]
  },
  {
    name: "A1/A2: Zakupy",
    items: [
      { de: "Ich möchte Brot kaufen.", pl: "Chciałabym kupić chleb." },
      { de: "Wie viel kostet das?", pl: "Ile to kosztuje?" },
      { de: "Ich brauche Milch und Eier.", pl: "Potrzebuję mleka i jajek." },
      { de: "Kann ich mit Karte bezahlen?", pl: "Czy mogę zapłacić kartą?" }
    ]
  },
  {
    name: "Hotel / Hausdame",
    items: [
      { de: "Das Zimmer ist fertig.", pl: "Pokój jest gotowy." },
      { de: "Ich brauche frische Handtücher.", pl: "Potrzebuję świeżych ręczników." },
      { de: "Die Rezeption hat angerufen.", pl: "Recepcja zadzwoniła." },
      { de: "Im Badezimmer fehlt Seife.", pl: "W łazience brakuje mydła." },
      { de: "Der Gast braucht ein neues Kissen.", pl: "Gość potrzebuje nowej poduszki." }
    ]
  }
];

let currentLesson = 0;
let currentItem = 0;
let points = Number(localStorage.getItem("anna_points") || 0);
let badges = Number(localStorage.getItem("anna_badges") || 0);

const lessonSelect = document.getElementById("lessonSelect");
const phrase = document.getElementById("phrase");
const translation = document.getElementById("translation");
const result = document.getElementById("result");
const heardText = document.getElementById("heardText");
const pointsEl = document.getElementById("points");
const badgesEl = document.getElementById("badges");
const levelEl = document.getElementById("level");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const teacherWrap = document.getElementById("teacherWrap");
const speechBubble = document.getElementById("speechBubble");

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .trim();
}

function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);
  if (!a || !b) return 0;
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  let same = 0;
  for (const word of bWords) {
    if (aWords.includes(word)) same++;
  }
  return same / Math.max(aWords.length, bWords.length);
}

function updateStats() {
  pointsEl.textContent = points;
  badgesEl.textContent = badges;

  let level = "A1";
  let percent = Math.min(points / 40 * 100, 100);

  if (points >= 40) level = "B1";
  else if (points >= 20) level = "A2";

  levelEl.textContent = level;
  progressText.textContent = "Poziom " + level + " · " + Math.round(percent) + "%";
  progressFill.style.width = percent + "%";

  localStorage.setItem("anna_points", points);
  localStorage.setItem("anna_badges", badges);
}

function fillLessons() {
  lessons.forEach((lesson, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = lesson.name;
    lessonSelect.appendChild(option);
  });
}

function currentSentence() {
  return lessons[currentLesson].items[currentItem];
}

function showPhrase() {
  const item = currentSentence();
  phrase.textContent = item.de;
  translation.textContent = item.pl;
  speechBubble.textContent = item.de;
  heardText.textContent = "—";
  result.textContent = "Posłuchaj Anny i powtórz zdanie.";
}

function speakGerman(text) {
  if (!("speechSynthesis" in window)) {
    result.textContent = "Ta przeglądarka nie obsługuje czytania głosem.";
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.82;
  utterance.pitch = 1.08;

  const voices = speechSynthesis.getVoices();
  const germanFemale = voices.find(v =>
    v.lang.startsWith("de") &&
    (
      v.name.toLowerCase().includes("female") ||
      v.name.toLowerCase().includes("anna") ||
      v.name.toLowerCase().includes("katja") ||
      v.name.toLowerCase().includes("helena")
    )
  );
  const germanAny = voices.find(v => v.lang.startsWith("de"));
  utterance.voice = germanFemale || germanAny || null;

  speechBubble.textContent = text;
  utterance.onstart = () => teacherWrap.classList.add("speaking");
  utterance.onend = () => teacherWrap.classList.remove("speaking");

  speechSynthesis.speak(utterance);
}

function listenAndCheck() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    result.textContent = "❌ Ta przeglądarka nie obsługuje rozpoznawania mowy. Spróbuj w Chrome albo Edge.";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "de-DE";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  result.textContent = "🎤 Słucham... Proszę mówić po niemiecku.";
  speechBubble.textContent = "Ich höre zu...";

  recognition.start();

  recognition.onresult = (event) => {
    const heard = event.results[0][0].transcript;
    heardText.textContent = heard;

    const target = currentSentence().de;
    const score = similarity(heard, target);

    if (score >= 0.85) {
      result.textContent = "✅ Sehr gut! Bardzo dobrze. +2 punkty";
      speechBubble.textContent = "Sehr gut! Das war richtig.";
      points += 2;
    } else if (score >= 0.55) {
      result.textContent = "⚠️ Drobny błąd. +1 punkt. Spróbuj jeszcze raz.";
      speechBubble.textContent = "Fast richtig. Versuch es noch einmal.";
      points += 1;
    } else {
      result.textContent = "❌ Spróbuj jeszcze raz. Kliknij „Głos Anny”.";
      speechBubble.textContent = "Bitte wiederhole den Satz.";
    }

    if (points > 0 && points % 10 === 0) {
      badges += 1;
      result.textContent += " 🏆 Nowa odznaka!";
    }

    updateStats();
  };

  recognition.onerror = () => {
    result.textContent = "❌ Nie udało się rozpoznać głosu. Sprawdź mikrofon i zgodę w przeglądarce.";
    speechBubble.textContent = "Bitte prüfe dein Mikrofon.";
  };
}

function nextPhrase() {
  currentItem++;
  if (currentItem >= lessons[currentLesson].items.length) currentItem = 0;
  showPhrase();
  speakGerman(currentSentence().de);
}

function askQuiz() {
  const questions = [
    { q: "Wie heißt du?", hint: "Odpowiedz: Ich heiße ..." },
    { q: "Wo wohnst du?", hint: "Odpowiedz: Ich wohne in ..." },
    { q: "Wie geht es dir?", hint: "Odpowiedz: Mir geht es gut." },
    { q: "Was brauchst du im Hotel?", hint: "Odpowiedz: Ich brauche ..." },
    { q: "Ist das Zimmer fertig?", hint: "Odpowiedz: Ja, das Zimmer ist fertig." }
  ];

  const item = questions[Math.floor(Math.random() * questions.length)];
  document.getElementById("quizQuestion").textContent = item.q;
  document.getElementById("quizHint").textContent = item.hint;
  speakGerman(item.q);
}

document.getElementById("startBtn").addEventListener("click", () => {
  showPhrase();
  speakGerman(currentSentence().de);
});

document.getElementById("speakBtn").addEventListener("click", () => speakGerman(currentSentence().de));
document.getElementById("listenBtn").addEventListener("click", listenAndCheck);
document.getElementById("nextBtn").addEventListener("click", nextPhrase);
document.getElementById("quizBtn").addEventListener("click", askQuiz);

lessonSelect.addEventListener("change", (event) => {
  currentLesson = Number(event.target.value);
  currentItem = 0;
  showPhrase();
});

speechSynthesis.onvoiceschanged = () => {};
fillLessons();
updateStats();
showPhrase();
