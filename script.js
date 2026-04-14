const currentPage = document.body.dataset.page;

const hrefMap = {
  home: "index.html",
  schedule: "schedule.html",
  details: "details.html",
  budget: "budget.html",
  links: "links.html",
};

document.querySelectorAll(".nav a").forEach((link) => {
  const target = hrefMap[currentPage];

  if (link.getAttribute("href") === target) {
    link.classList.add("active");
  }
});

if (currentPage === "budget") {
  const travelerCount = 2;
  const storageKey = "travel-budget-items";
  const defaultItems = [
    { id: "flight-1", category: "항공", title: "인천-쿤밍 / 리장-인천 항공권", amount: 680000 },
    { id: "hotel-1", category: "숙소", title: "쿤밍 · 리장 · 샹그릴라 숙소", amount: 540000 },
    { id: "food-1", category: "식비", title: "여행 전체 식비 예상", amount: 280000 },
  ];

  const form = document.getElementById("budget-form");
  const totalElement = document.getElementById("budget-total");
  const perPersonElement = document.getElementById("budget-per-person");
  const summaryElement = document.getElementById("budget-summary");
  const itemsElement = document.getElementById("budget-items");
  const resetButton = document.getElementById("budget-reset");

  const readItems = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : defaultItems;
    } catch {
      return defaultItems;
    }
  };

  let budgetItems = readItems();

  const formatCurrency = (value) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);

  const saveItems = () => {
    localStorage.setItem(storageKey, JSON.stringify(budgetItems));
  };

  const renderBudget = () => {
    const total = budgetItems.reduce((sum, item) => sum + item.amount, 0);
    totalElement.textContent = formatCurrency(total);
    perPersonElement.textContent = formatCurrency(Math.round(total / travelerCount));

    if (!budgetItems.length) {
      perPersonElement.textContent = formatCurrency(0);
      summaryElement.innerHTML = "<p class='budget-summary-empty'>아직 등록된 지출이 없습니다. 항목을 추가해보세요.</p>";
      itemsElement.innerHTML = "<p class='budget-empty'>등록된 지출 항목이 없습니다.</p>";
      return;
    }

    const grouped = budgetItems.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + item.amount;
      return acc;
    }, {});

    summaryElement.innerHTML = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => {
        const percent = total ? Math.round((amount / total) * 100) : 0;
        return `
          <article class="budget-summary-card">
            <div class="budget-row">
              <span>${category}</span>
              <strong>${formatCurrency(amount)}</strong>
            </div>
            <div class="bar"><span style="width: ${percent}%"></span></div>
            <span class="budget-percent">전체 지출의 ${percent}%</span>
          </article>
        `;
      })
      .join("");

    itemsElement.innerHTML = budgetItems
      .map(
        (item) => `
          <article class="budget-item">
            <div>
              <h3>${item.title}</h3>
              <div class="budget-meta">
                <span class="budget-chip">${item.category}</span>
              </div>
            </div>
            <div class="budget-amount-wrap">
              <strong class="budget-amount">${formatCurrency(item.amount)}</strong>
              <button type="button" class="button secondary budget-delete" data-id="${item.id}">삭제</button>
            </div>
          </article>
        `
      )
      .join("");
  };

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const category = String(formData.get("category") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const amount = Number(formData.get("amount") || 0);

    if (!category || !title || !amount) {
      return;
    }

    budgetItems = [
      ...budgetItems,
      {
        id: `${Date.now()}`,
        category,
        title,
        amount,
      },
    ];

    saveItems();
    renderBudget();
    form.reset();
  });

  itemsElement?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const { id } = target.dataset;
    if (!id) {
      return;
    }

    budgetItems = budgetItems.filter((item) => item.id !== id);
    saveItems();
    renderBudget();
  });

  resetButton?.addEventListener("click", () => {
    budgetItems = [];
    saveItems();
    renderBudget();
  });

  renderBudget();
}

if (currentPage === "home" && window.L) {
  const mapElement = document.getElementById("travel-map");

  if (mapElement) {
    const interpolatePoint = (start, end, ratio = 0.6) => [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ];

    const route = [
      { name: "인천공항", coords: [37.4602, 126.4407], tooltipDirection: "right", tooltipOffset: [12, -2], tooltipClass: "city-airport label-right" },
      { name: "쿤밍", coords: [25.0389, 102.7183], tooltipDirection: "bottom", tooltipOffset: [2, 18], tooltipClass: "city-kunming label-bottom" },
      { name: "리장", coords: [26.8721, 100.23], tooltipDirection: "right", tooltipOffset: [20, 0], tooltipClass: "city-lijiang label-right" },
      { name: "샹그릴라", coords: [27.8269, 99.706], tooltipDirection: "left", tooltipOffset: [-20, -2], tooltipClass: "city-shangrila label-left" },
    ];

    const segments = [
      {
        coords: [route[0].coords, route[1].coords],
        color: "#155e95",
        weight: 4,
        dashArray: "10 10",
      },
      {
        coords: [route[1].coords, route[2].coords],
        color: "#0e8a95",
        weight: 5,
      },
      {
        coords: [route[2].coords, route[3].coords],
        color: "#0c4f68",
        weight: 5,
      },
    ];

    const map = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const polylines = segments.map((segment) =>
      L.polyline(segment.coords, {
        color: segment.color,
        weight: segment.weight,
        opacity: 0.94,
        dashArray: segment.dashArray,
        lineJoin: "round",
      }).addTo(map)
    );

    const planePoint = interpolatePoint(route[0].coords, route[1].coords, 0.56);

    L.marker(planePoint, {
      interactive: false,
      icon: L.divIcon({
        className: "route-plane-icon",
        html: "<div><svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true' style='transform: rotate(225deg)'><path d='M21 15.6V13.8L13.4 9.3V4.35C13.4 3.55 12.76 2.9 11.95 2.9C11.14 2.9 10.5 3.55 10.5 4.35V9.3L2.9 13.8V15.6L10.5 13.35V18.3L8.6 19.75V21.1L11.95 20.1L15.3 21.1V19.75L13.4 18.3V13.35L21 15.6Z' fill='currentColor'/></svg></div>",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
    }).addTo(map);

    route.forEach((point, index) => {
      const marker = L.circleMarker(point.coords, {
        radius: index === 0 || index === route.length - 1 ? 8 : 7,
        color: index === 0 ? "#155e95" : "#0e8a95",
        weight: 3,
        fillColor: "#ffffff",
        fillOpacity: 1,
      }).addTo(map);

      marker.bindTooltip(`<div>${point.name}</div>`, {
        permanent: true,
        direction: point.tooltipDirection,
        offset: point.tooltipOffset,
        className: `route-city-label ${point.tooltipClass}`,
      });

      marker.bindPopup(point.name);
    });

    const bounds = L.featureGroup(polylines).getBounds();
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}
