const currentPage = document.body.dataset.page;

const hrefMap = {
  home: "index.html",
  schedule: "schedule.html",
  details: "details.html",
  budget: "budget.html",
  links: "links.html",
};

const isValidTime = (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
const normalizeTime = (value) => String(value || "").trim();
const getTimeSortValue = (value) => {
  const normalized = normalizeTime(value);
  const [start] = normalized.split("~");
  return isValidTime(start) ? start : "99:99";
};

window.addEventListener("error", (event) => {
  console.error("Unhandled script error", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection", event.reason);
});

document.querySelectorAll(".nav a").forEach((link) => {
  const target = hrefMap[currentPage];

  if (link.getAttribute("href") === target) {
    link.classList.add("active");
  }
});

if (currentPage === "budget") {
  const travelerCount = 2;
  const form = document.getElementById("budget-form");
  const totalElement = document.getElementById("budget-total");
  const perPersonElement = document.getElementById("budget-per-person");
  const summaryElement = document.getElementById("budget-summary");
  const itemsElement = document.getElementById("budget-items");
  const resetButton = document.getElementById("budget-reset");
  const setupNotice = document.getElementById("budget-setup-notice");
  const supabaseConfig = window.SUPABASE_CONFIG || {};
  const supabaseUrl = supabaseConfig.url || "";
  const supabaseAnonKey = supabaseConfig.anonKey || "";
  let budgetItems = [];
  let supabaseClient = null;

  const formatCurrency = (value) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);

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

  const setLoadingState = (isLoading) => {
    const submitButton = form?.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = isLoading;
    }
    if (resetButton) {
      resetButton.disabled = isLoading;
    }
  };

  const loadExpenses = async () => {
    if (!supabaseClient) {
      return;
    }

    const { data, error } = await supabaseClient
      .from("expenses")
      .select("id, category, title, amount, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      summaryElement.innerHTML = "<p class='budget-summary-empty'>지출을 불러오지 못했습니다. Supabase 설정을 확인해주세요.</p>";
      itemsElement.innerHTML = "";
      return;
    }

    budgetItems = data || [];
    renderBudget();
  };

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!supabaseClient || !form) {
      return;
    }

    const submit = async () => {
      const formData = new FormData(form);
      const category = String(formData.get("category") || "").trim();
      const title = String(formData.get("title") || "").trim();
      const amount = Number(formData.get("amount") || 0);

      if (!category || !title || !amount) {
        return;
      }

      setLoadingState(true);

      const { error } = await supabaseClient.from("expenses").insert({
        category,
        title,
        amount,
      });

      setLoadingState(false);

      if (error) {
        alert("지출 저장에 실패했습니다. Supabase 설정 또는 권한을 확인해주세요.");
        return;
      }

      form.reset();
      await loadExpenses();
    };

    submit();
  });

  itemsElement?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !supabaseClient) {
      return;
    }

    const { id } = target.dataset;
    if (!id) {
      return;
    }

    const removeExpense = async () => {
      setLoadingState(true);
      const { error } = await supabaseClient.from("expenses").delete().eq("id", id);
      setLoadingState(false);

      if (error) {
        alert("지출 삭제에 실패했습니다.");
        return;
      }

      await loadExpenses();
    };

    removeExpense();
  });

  resetButton?.addEventListener("click", () => {
    if (!supabaseClient) {
      return;
    }

    const resetExpenses = async () => {
      setLoadingState(true);
      const { error } = await supabaseClient.from("expenses").delete().gte("id", 0);
      setLoadingState(false);

      if (error) {
        alert("전체 초기화에 실패했습니다.");
        return;
      }

      await loadExpenses();
    };

    resetExpenses();
  });

  if (!supabaseUrl || !supabaseAnonKey || !window.supabase?.createClient) {
    setupNotice?.classList.remove("is-hidden");
    renderBudget();
  } else {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    loadExpenses();

    supabaseClient
      .channel("public:expenses")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        () => {
          loadExpenses();
        }
      )
      .subscribe();
  }
}

if (currentPage === "details") {
  const groupsElement = document.getElementById("checklist-groups");
  const setupNotice = document.getElementById("checklist-setup-notice");
  const progressCountElement = document.getElementById("checklist-progress-count");
  const progressBarElement = document.getElementById("checklist-progress-bar");
  const progressCopyElement = document.getElementById("checklist-progress-copy");
  const ddayValueElement = document.getElementById("checklist-dday-value");
  const ddayCopyElement = document.getElementById("checklist-dday-copy");
  const pendingListElement = document.getElementById("checklist-pending-list");
  const supabaseConfig = window.SUPABASE_CONFIG || {};
  const supabaseUrl = supabaseConfig.url || "";
  const supabaseAnonKey = supabaseConfig.anonKey || "";
  let supabaseClient = null;
  let checklistItems = [];
  const departureDate = "2026-04-30";

  const defaultChecklistItems = [
    {
      slug: "travel-documents",
      category: "출발 전",
      title: "필수 서류 챙기기",
      note: "여권, 항공권, 호텔 예약내역, 여행자보험 가입내역 확인",
      sort_order: 10,
    },
    {
      slug: "travel-insurance",
      category: "출발 전",
      title: "여행자보험 가입하기",
      note: "보장 범위와 보험증권 PDF 저장 여부까지 확인",
      sort_order: 20,
    },
    {
      slug: "esim-roaming",
      category: "출발 전",
      title: "eSIM 또는 로밍 설정하기",
      note: "출국 전 개통 방식과 현지 데이터 사용 가능 여부 확인",
      sort_order: 30,
    },
    {
      slug: "power-bank",
      category: "준비물",
      title: "보조배터리 확인하기",
      note: "용량, 충전 상태, 항공 반입 가능 여부, CCC 인증 여부 체크",
      sort_order: 40,
    },
    {
      slug: "medicine-kit",
      category: "준비물",
      title: "상비약 챙기기",
      note: "소화제, 지사제, 진통제, 감기약 등 필요한 약 미리 준비",
      sort_order: 50,
    },
    {
      slug: "cash-exchange",
      category: "출발 전",
      title: "환전하기",
      note: "현금 30만원 수준이 적당한지 최종 예산과 결제수단 기준으로 점검",
      sort_order: 60,
    },
  ];

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const getDdayText = () => {
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const targetDate = new Date(`${departureDate}T00:00:00`);
    const diff = Math.round((targetDate - currentDate) / (1000 * 60 * 60 * 24));

    if (diff > 0) {
      return { label: `D-${diff}`, copy: `${departureDate} 출발까지 ${diff}일 남았어요.` };
    }
    if (diff === 0) {
      return { label: "D-Day", copy: "오늘 출발입니다. 마지막 확인만 하면 돼요." };
    }
    return { label: `D+${Math.abs(diff)}`, copy: `${departureDate} 출발 기준 ${Math.abs(diff)}일 지났어요.` };
  };

  const renderChecklist = () => {
    const totalCount = checklistItems.length;
    const completedCount = checklistItems.filter((item) => item.is_checked).length;
    const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const pendingItems = checklistItems.filter((item) => !item.is_checked);
    const dday = getDdayText();

    if (progressCountElement) {
      progressCountElement.textContent = `${completedCount} / ${totalCount} 완료`;
    }
    if (progressBarElement) {
      progressBarElement.style.width = `${progress}%`;
    }
    if (progressCopyElement) {
      progressCopyElement.textContent = totalCount
        ? progress === 100
          ? "출발 준비가 모두 끝났어요."
          : `${totalCount - completedCount}개 남았어요. 출발 전에 하나씩 체크해보세요.`
        : "출발 전 체크할 항목을 정리하고 있어요.";
    }

    if (ddayValueElement) {
      ddayValueElement.textContent = dday.label;
    }
    if (ddayCopyElement) {
      ddayCopyElement.textContent = dday.copy;
    }
    if (pendingListElement) {
      pendingListElement.innerHTML = pendingItems.length
        ? pendingItems
            .slice(0, 4)
            .map((item) => `<li>${escapeHtml(item.title)}</li>`)
            .join("")
        : "<li>남은 항목이 없어요. 준비 완료입니다.</li>";
    }

    if (!groupsElement) {
      return;
    }

    if (!totalCount) {
      groupsElement.innerHTML = "<p class='budget-empty'>체크리스트 항목이 아직 없습니다.</p>";
      return;
    }

    groupsElement.innerHTML = `
      <section class="panel checklist-group">
        <div class="checklist-items">
          ${checklistItems
            .map(
              (item) => `
                <label class="checklist-item ${item.is_checked ? "is-checked" : ""}">
                  <span class="checklist-item-toggle">
                    <input type="checkbox" data-id="${item.id}" ${item.is_checked ? "checked" : ""}>
                    <span></span>
                  </span>
                  <span class="checklist-item-copy">
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.note || "")}</p>
                  </span>
                </label>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  };

  const loadChecklist = async () => {
    if (!supabaseClient) {
      return;
    }

    const { data, error } = await supabaseClient
      .from("trip_checklist_items")
      .select("id, slug, category, title, note, sort_order, is_checked")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      groupsElement.innerHTML = "<p class='budget-empty'>체크리스트를 불러오지 못했습니다. Supabase 설정을 확인해주세요.</p>";
      return;
    }

    if (!data?.length) {
      const { error: seedError } = await supabaseClient
        .from("trip_checklist_items")
        .upsert(defaultChecklistItems, { onConflict: "slug" });

      if (seedError) {
        groupsElement.innerHTML = `<p class='budget-empty'>기본 체크리스트 생성에 실패했습니다: ${escapeHtml(seedError.message)}</p>`;
        return;
      }

      await loadChecklist();
      return;
    }

    checklistItems = data || [];
    renderChecklist();
  };

  groupsElement?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== "checkbox" || !supabaseClient) {
      return;
    }

    const { id } = target.dataset;
    if (!id) {
      return;
    }

    const nextChecked = target.checked;
    checklistItems = checklistItems.map((item) =>
      `${item.id}` === id ? { ...item, is_checked: nextChecked } : item
    );
    renderChecklist();

    const updateChecklist = async () => {
      const { error } = await supabaseClient
        .from("trip_checklist_items")
        .update({
          is_checked: nextChecked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        alert(`체크 상태 저장에 실패했습니다: ${error.message}`);
        await loadChecklist();
      }
    };

    updateChecklist();
  });

  if (!supabaseUrl || !supabaseAnonKey || !window.supabase?.createClient) {
    setupNotice?.classList.remove("is-hidden");
    checklistItems = defaultChecklistItems.map((item, index) => ({
      ...item,
      id: `local-${index}`,
      is_checked: false,
    }));
    renderChecklist();
  } else {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    loadChecklist();

    supabaseClient
      .channel("public:trip_checklist_items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_checklist_items",
        },
        () => {
          loadChecklist();
        }
      )
      .subscribe();
  }
}

if (currentPage === "schedule") {
  const tripStartDate = "2026-04-30";
  const form = document.getElementById("schedule-form");
  const listElement = document.getElementById("schedule-list");
  const boardElement = document.getElementById("schedule-board");
  const resetButton = document.getElementById("schedule-reset");
  const setupNotice = document.getElementById("schedule-setup-notice");
  const supabaseConfig = window.SUPABASE_CONFIG || {};
  const supabaseUrl = supabaseConfig.url || "";
  const supabaseAnonKey = supabaseConfig.anonKey || "";
  let scheduleItems = [];
  let supabaseClient = null;
  const boardStartHour = 1;
  const boardEndHour = 24;
  const minutesPerHour = 60;
  const totalBoardMinutes = 24 * minutesPerHour;

  const formatDate = (value) => {
    const date = new Date(value);
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    return `${month}.${day} ${weekday}`;
  };

  const getDayLabel = (value) => {
    const start = new Date(tripStartDate);
    const current = new Date(value);
    const diff = Math.round((current - start) / (1000 * 60 * 60 * 24));
    return `DAY ${diff + 1}`;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const parseTimeToMinutes = (value) => {
    if (!isValidTime(value)) {
      return null;
    }

    const [hours, minutes] = value.split(":").map(Number);
    return hours * minutesPerHour + minutes;
  };

  const parseTimeRange = (value) => {
    const [startRaw, endRaw] = String(value || "").split("~").map((part) => normalizeTime(part));
    const startMinutes = parseTimeToMinutes(startRaw);
    const endMinutes = parseTimeToMinutes(endRaw);

    if (startMinutes === null || endMinutes === null) {
      return null;
    }

    return {
      startLabel: startRaw,
      endLabel: endRaw,
      startMinutes,
      endMinutes: endMinutes > startMinutes ? endMinutes : startMinutes + 30,
    };
  };

  const renderScheduleBoard = (groupedEntries) => {
    if (!boardElement) {
      return;
    }

    const dates = Object.keys(groupedEntries);

    if (!dates.length) {
      boardElement.innerHTML = "<p class='schedule-board-empty'>등록된 일정이 아직 없습니다. 일정을 추가하면 시간표가 여기에 표시됩니다.</p>";
      return;
    }

    const hourLabels = Array.from({ length: boardEndHour - boardStartHour + 1 }, (_, index) => {
      const hour = boardStartHour + index;
      return `${`${hour}`.padStart(2, "0")}:00`;
    });

    const headerMarkup = dates
      .map((date) => {
        const dayItems = groupedEntries[date];
        return `
          <div class="schedule-board-day">
            <strong>${escapeHtml(dayItems[0].day_label || getDayLabel(date))}</strong>
            <span>${escapeHtml(formatDate(date))}</span>
          </div>
        `;
      })
      .join("");

    const timeColumnMarkup = hourLabels
      .map((label) => `<div class="schedule-board-time">${label}</div>`)
      .join("");

    const dayColumnsMarkup = dates
      .map((date) => {
        const dayItems = groupedEntries[date];
        const eventMarkup = dayItems
          .map((item) => {
            const timeRange = parseTimeRange(item.time);
            if (!timeRange) {
              return "";
            }

            const clampedStart = Math.max(timeRange.startMinutes, boardStartHour * minutesPerHour);
            const clampedEnd = Math.min(timeRange.endMinutes, boardEndHour * minutesPerHour);

            if (clampedEnd <= clampedStart) {
              return "";
            }

            const top = ((clampedStart - boardStartHour * minutesPerHour) / totalBoardMinutes) * 100;
            const height = ((clampedEnd - clampedStart) / totalBoardMinutes) * 100;
            const itemLines = Array.isArray(item.items) ? item.items : [];

            return `
              <article class="schedule-board-event" style="top: ${top}%; height: ${height}%;">
                <span class="schedule-board-event-time">${escapeHtml(`${timeRange.startLabel} - ${timeRange.endLabel}`)}</span>
                <strong>${escapeHtml(item.title)}</strong>
                ${itemLines.length ? `<ul>${itemLines.map((entry) => `<li>${escapeHtml(entry)}</li>`).join("")}</ul>` : ""}
              </article>
            `;
          })
          .join("");

        return `<div class="schedule-board-column">${eventMarkup}</div>`;
      })
      .join("");

    boardElement.innerHTML = `
      <div class="schedule-board-shell">
        <div class="schedule-board-corner"></div>
        <div class="schedule-board-header-scroll">
          <div class="schedule-board-header-grid" style="--day-count: ${dates.length};">
            ${headerMarkup}
          </div>
        </div>
        <div class="schedule-board-time-scroll">
          <div class="schedule-board-time-grid">
            ${timeColumnMarkup}
          </div>
        </div>
        <div class="schedule-board-body-scroll">
          <div class="schedule-board-grid" style="--day-count: ${dates.length};">
            ${dayColumnsMarkup}
          </div>
        </div>
      </div>
    `;

    const headerScroll = boardElement.querySelector(".schedule-board-header-scroll");
    const timeScroll = boardElement.querySelector(".schedule-board-time-scroll");
    const bodyScroll = boardElement.querySelector(".schedule-board-body-scroll");

    if (headerScroll && timeScroll && bodyScroll) {
      let isSyncing = false;

      bodyScroll.addEventListener("scroll", () => {
        if (isSyncing) {
          return;
        }
        isSyncing = true;
        headerScroll.scrollLeft = bodyScroll.scrollLeft;
        timeScroll.scrollTop = bodyScroll.scrollTop;
        isSyncing = false;
      });

      headerScroll.addEventListener("scroll", () => {
        if (isSyncing) {
          return;
        }
        isSyncing = true;
        bodyScroll.scrollLeft = headerScroll.scrollLeft;
        isSyncing = false;
      });

      timeScroll.addEventListener("scroll", () => {
        if (isSyncing) {
          return;
        }
        isSyncing = true;
        bodyScroll.scrollTop = timeScroll.scrollTop;
        isSyncing = false;
      });
    }

  };

  const setLoadingState = (isLoading) => {
    const submitButton = form?.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = isLoading;
    }
    if (resetButton) {
      resetButton.disabled = isLoading;
    }
  };

  const renderSchedule = () => {
    renderScheduleBoard({});
    if (!scheduleItems.length) {
      listElement.innerHTML = "<p class='budget-empty'>등록된 일정이 없습니다. 첫 일정을 추가해보세요.</p>";
      return;
    }

    const sortedDates = [...scheduleItems].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return getTimeSortValue(a.time).localeCompare(getTimeSortValue(b.time));
    });
    const groupedByDate = sortedDates.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = [];
      }
      acc[item.date].push(item);
      return acc;
    }, {});

    listElement.innerHTML = Object.entries(groupedByDate)
      .map(([date, items]) => `
        <article class="timeline-day timeline-group">
          <div class="timeline-date">
            <span>${items[0].day_label}</span>
            <strong>${formatDate(date)}</strong>
          </div>
          <div class="timeline-body">
            ${items
              .map(
                (item) => `
                  <section class="timeline-entry">
                    <div class="timeline-body-head">
                      <h2>${item.title}</h2>
                      <button type="button" class="button secondary timeline-delete" data-id="${item.id}">삭제</button>
                    </div>
                    <span class="timeline-time">${item.time || "--:--"}</span>
                    <ul>
                      ${(item.items || [])
                        .map((entry) => `<li>${entry}</li>`)
                        .join("")}
                    </ul>
                  </section>
                `
              )
              .join("")}
          </div>
        </article>
      `)
      .join("");

    renderScheduleBoard(groupedByDate);
  };

  const loadSchedule = async () => {
    if (!supabaseClient) {
      return;
    }

    const { data, error } = await supabaseClient
      .from("itinerary_items")
      .select("id, date, day_label, title, time, items, created_at")
      .order("date", { ascending: true })
      .order("time", { ascending: true });

    if (error) {
      listElement.innerHTML = "<p class='budget-empty'>일정을 불러오지 못했습니다. Supabase 테이블 설정을 확인해주세요.</p>";
      return;
    }

    scheduleItems = data || [];
    renderSchedule();
  };

  form?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!supabaseClient || !form) {
      return;
    }

    const submit = async () => {
      const formData = new FormData(form);
      const date = String(formData.get("date") || "").trim();
      const startTime = String(formData.get("startTime") || "").trim();
      const endTime = String(formData.get("endTime") || "").trim();
      const title = String(formData.get("title") || "").trim();
      const items = String(formData.get("items") || "")
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      const normalizedStartTime = normalizeTime(startTime);
      const normalizedEndTime = normalizeTime(endTime);
      const time = normalizedStartTime && normalizedEndTime ? `${normalizedStartTime}~${normalizedEndTime}` : "";

      if (!date || !title || !startTime || !endTime || !items.length) {
        alert("날짜, 시간, 제목, 내용을 모두 입력해주세요.");
        return;
      }

      if (!isValidTime(normalizedStartTime) || !isValidTime(normalizedEndTime)) {
        alert("시간은 24시간 형식으로 입력해주세요. 예: 07:45");
        return;
      }

      setLoadingState(true);
        const { error } = await supabaseClient.from("itinerary_items").insert({
        date,
        day_label: getDayLabel(date),
        title,
        time,
        items,
      });
      setLoadingState(false);

      if (error) {
        alert("일정 저장에 실패했습니다. Supabase 테이블 설정을 확인해주세요.");
        return;
      }

      form.reset();
      await loadSchedule();
    };

    submit();
  });

  listElement?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !supabaseClient) {
      return;
    }

    const { id } = target.dataset;
    if (!id) {
      return;
    }

    const removeSchedule = async () => {
      setLoadingState(true);
      const { error } = await supabaseClient.from("itinerary_items").delete().eq("id", id);
      setLoadingState(false);

      if (error) {
        alert("일정 삭제에 실패했습니다.");
        return;
      }

      await loadSchedule();
    };

    removeSchedule();
  });

  resetButton?.addEventListener("click", () => {
    if (!supabaseClient) {
      return;
    }

    const resetSchedule = async () => {
      setLoadingState(true);
      const { error } = await supabaseClient.from("itinerary_items").delete().gte("id", 0);
      setLoadingState(false);

      if (error) {
        alert("전체 초기화에 실패했습니다.");
        return;
      }

      await loadSchedule();
    };

    resetSchedule();
  });

  if (!supabaseUrl || !supabaseAnonKey || !window.supabase?.createClient) {
    setupNotice?.classList.remove("is-hidden");
    renderSchedule();
  } else {
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    loadSchedule();

    supabaseClient
      .channel("public:itinerary_items")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "itinerary_items",
        },
        () => {
          loadSchedule();
        }
      )
      .subscribe();
  }
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
