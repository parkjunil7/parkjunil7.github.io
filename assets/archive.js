const ARCHIVE_COUNTRIES = {
  "392": {
    title: "Japan",
    href: "./sapporo/index.html",
    className: "",
    summary: "홋카이도 삿포로",
    date: travelPage.details.sapporoPeriod
  },
  "156": {
    title: "China",
    href: "./china/index.html",
    className: "",
    summary: "쿤밍, 리장, 샹그릴라",
    date: travelPage.details.chinaPeriod
  },
  "410": {
    title: "Korea",
    href: "#",
    className: "secondary",
    summary: `
      <span class="archive-stop">
        <span class="archive-place">경상북도 경주</span>
        <span class="archive-period">${travelPage.details.gyeongjuPeriod}</span>
      </span>
      <span class="archive-stop">
        <span class="archive-place">강원도 영월</span>
        <span class="archive-period">${travelPage.details.yeongwolPeriod}</span>
      </span>
      <span class="archive-stop">
        <span class="archive-place">제주도</span>
        <span class="archive-period">${travelPage.details.jejuPeriod}</span>
      </span>
      <a href="./jeju/index.html">사이트 이동</a>
    `,
    date: ""
  }
};

const MOBILE_ARCHIVES = [
  {
    country: "Korea",
    title: "경상북도 경주",
    date: travelPage.details.gyeongjuPeriod,
    route: "경주 황리단길 · 감포 문무대왕릉",
    note: "",
    href: "",
    actionLabel: ""
  },
  {
    country: "Korea",
    title: "강원도 영월",
    date: travelPage.details.yeongwolPeriod,
    route: "청령포 · 돌개구멍",
    note: "",
    href: "",
    actionLabel: ""
  },
  {
    country: "China",
    title: "쿤밍, 리장, 샹그릴라",
    date: travelPage.details.chinaPeriod,
    route: "쿤밍 → 리장 → 샹그릴라",
    note: "你好, China!!",
    href: "./china/index.html",
    actionLabel: "사이트 이동"
  },
  {
    country: "Korea",
    title: "제주도",
    date: travelPage.details.jejuPeriod,
    route: "제주공항 → 서귀포 → 성산",
    note: "안녕, 제주",
    href: "./jeju/index.html",
    actionLabel: "사이트 이동"
  }
];

ARCHIVE_COUNTRIES["410"].summary = ARCHIVE_COUNTRIES["410"].summary.replace(
  /<a href="\.\/jeju\/index\.html">.*?<\/a>/,
  `
      <span class="archive-stop">
        <span class="archive-place">\uAC15\uC6D0\uB3C4 \uAC15\uB989</span>
        <span class="archive-period">${travelPage.details.gangneungPeriod}</span>
      </span>
      <span class="archive-stop">
        <span class="archive-place">강원도 정선</span>
        <span class="archive-period">${travelPage.details.jeongseonPeriod}</span>
      </span>
      <a href="./jeju/index.html">\uC81C\uC8FC\uB3C4 \uC0AC\uC774\uD2B8 \uC774\uB3D9</a>
      <a href="./gangneung/index.html">\uAC15\uB989 \uC0AC\uC774\uD2B8 \uC774\uB3D9</a>
    `
);

MOBILE_ARCHIVES.push({
  country: "Korea",
  title: "\uAC15\uC6D0\uB3C4 \uAC15\uB989",
  date: travelPage.details.gangneungPeriod,
  route: "\uC528\uB9C8\uD06C \uD638\uD154",
  note: "",
  href: "./gangneung/index.html",
  actionLabel: "\uC0AC\uC774\uD2B8 \uC774\uB3D9"
});

MOBILE_ARCHIVES.push({
  country: "Korea",
  title: "강원도 정선",
  date: travelPage.details.jeongseonPeriod,
  route: "",
  note: "",
  href: "",
  actionLabel: ""
});

MOBILE_ARCHIVES.push({
  country: "Japan", title: "홋카이도 삿포로",
  date: travelPage.details.sapporoPeriod, route: "5박 6일 · 삿포로 여행",
  note: "", href: "./sapporo/index.html", actionLabel: "사이트 이동"
});
const svg = d3.select("#world-map");
const panel = document.getElementById("archive-panel");
const panelTitle = document.getElementById("panel-title");
const panelCopy = document.getElementById("panel-copy");
const closeButton = document.getElementById("panel-close");
const mobileArchiveList = document.getElementById("mobile-archive-list");
const width = 1600;
const height = 900;

renderMobileArchive();

const projection = d3.geoNaturalEarth1()
  .fitExtent([[4, 4], [width - 4, height - 4]], { type: "Sphere" });
const path = d3.geoPath(projection);

svg.append("path")
  .datum({ type: "Sphere" })
  .attr("class", "sphere")
  .attr("d", path);

let activeCountryPath = null;

fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
  .then((response) => response.json())
  .then((world) => {
    const countries = topojson.feature(world, world.objects.countries).features;

    svg.append("g")
      .selectAll("path")
      .data(countries)
      .join("path")
      .attr("class", (d) => {
        const archive = ARCHIVE_COUNTRIES[String(d.id)];
        if (!archive) {
          return "country";
        }
        return `country trip ${archive.className}`.trim();
      })
      .attr("d", path)
      .on("click", (event, d) => {
        event.stopPropagation();

        const archive = ARCHIVE_COUNTRIES[String(d.id)];

        if (!archive) {
          closeArchive();
          return;
        }

        activeCountryPath = event.currentTarget;
        openArchive(archive);
      });
  });

document.body.addEventListener("click", (event) => {
  if (panel.contains(event.target)) {
    return;
  }

  closeArchive();
});

closeButton.addEventListener("click", () => {
  closeArchive();
});

function renderMobileArchive() {
  mobileArchiveList.innerHTML = MOBILE_ARCHIVES.map((item) => {
    const actionMarkup = item.href
      ? `<a class="mobile-card-action" href="${item.href}">${item.actionLabel}</a>`
      : item.actionLabel
        ? `<span class="mobile-card-action is-disabled">${item.actionLabel}</span>`
        : "";
    const noteMarkup = item.note ? `<div class="mobile-card-note">${item.note}</div>` : "";

    return `
      <article class="mobile-card">
        <span class="mobile-card-kind">${item.country}</span>
        <h2>${item.title}</h2>
        <div class="mobile-card-date">${item.date}</div>
        <div class="mobile-card-route">${item.route}</div>
        ${noteMarkup}
        ${actionMarkup}
      </article>
    `;
  }).join("");
}

function openArchive(archive) {
  panelTitle.textContent = archive.title;

  if (archive.date) {
    panelCopy.innerHTML = `
      <strong>${archive.summary}</strong>
      <span>${archive.date}</span>
      <a href="${archive.href}">사이트 이동</a>
    `;
  } else {
    panelCopy.innerHTML = archive.summary;
  }

  panel.classList.add("is-open");
  if (activeCountryPath) {
    activeCountryPath.classList.add("is-active");
  }
}

function closeArchive() {
  panel.classList.remove("is-open");
  if (activeCountryPath) {
    activeCountryPath.classList.remove("is-active");
  }
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href="./china/index.html"]');
  if (link) {
    sessionStorage.setItem("showArrivalFlight", "1");
  }
});
