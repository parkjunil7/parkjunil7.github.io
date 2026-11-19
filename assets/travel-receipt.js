(() => {
  const form = document.querySelector('#budget-form');
  const panel = document.createElement('details');
  panel.className = 'ai-receipt';
  panel.innerHTML = `<summary>영수증 사진으로 입력</summary>
  <p>영수증 한 장을 선택하면 OpenAI로 전송해 상호와 결제액을 읽어요. 카드번호 등 불필요한 정보는 가려 주세요.</p>
  <label class="form-field"><span>영수증 사진 선택 · AI로 읽기</span><input type="file" accept="image/*"></label>
  <p role="status" aria-live="polite"></p>
  <form class="receipt-review" hidden>
  <label class="form-field">항목명<input name="merchant" required maxlength="120"></label>
  <label class="form-field">분류<select name="category"></select></label>
  <label class="form-field">영수증 결제액<input name="original" type="number" step="any" min="0.000001" required></label>
  <label class="form-field">통화 코드<input name="currency" placeholder="예: JPY" maxlength="3" pattern="[A-Za-z]{3}" required></label>
  <label class="form-field">외화 1단위당 원화 환율<input name="rate" type="number" step="any" min="0.000001" placeholder="예: 100엔이 950원이면 9.5"></label>
  <label class="form-field">등록할 원화 금액<input name="krw" type="number" step="1" min="1" max="2147483647" required placeholder="실제 원화 결제액 직접 입력 가능"></label>
  <button class="button primary">확인하고 입력칸에 반영</button></form>`;
  form.before(panel);
  const file = panel.querySelector('[type=file]');
  const status = panel.querySelector('[role=status]');
  const review = panel.querySelector('form');
  const fields = review.elements;
  fields.category.replaceChildren(...Array.from(form.elements.category.options, o => o.cloneNode(true)));
  function calculate() {
    const domestic = fields.currency.value.trim().toUpperCase() === 'KRW';
    fields.rate.parentElement.hidden = domestic;
    const factor = domestic ? 1 : fields.rate.valueAsNumber;
    const won = Math.round(fields.original.valueAsNumber * factor);
    fields.krw.value = Number.isSafeInteger(won) && won > 0 ? won : '';
  }
  for (const field of [fields.original, fields.currency, fields.rate]) field.addEventListener('input', calculate);
  review.addEventListener('submit', event => {
    event.preventDefault();
    form.elements.title.value = fields.merchant.value.trim();
    form.elements.category.value = fields.category.value;
    form.elements.amount.value = fields.krw.value;
    panel.open = false;
    form.elements.title.focus();
  });
  file.addEventListener('change', async () => {
    const photo = file.files[0];
    if (!photo) return;
    file.disabled = true;
    review.hidden = true;
    review.reset();
    status.textContent = '영수증을 읽고 있어요…';
    const url = URL.createObjectURL(photo);
    try {
      if (!photo.size || photo.size > 20*1024*1024 || /svg|gif/i.test(photo.type)) throw Error('20MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.');
      const image = new Image();
      image.src = url;
      try { await image.decode(); } catch { throw Error('사진을 열 수 없어요. JPG 또는 PNG 사진을 선택해 주세요.'); }
      if (image.width * image.height > 50000000) throw Error('영수증 부분만 잘라 다시 선택해 주세요.');
      const scale = Math.min(1, 2000/Math.max(image.width,image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1,Math.round(image.width*scale));
      canvas.height = Math.max(1,Math.round(image.height*scale));
      const context = canvas.getContext('2d');
      context.fillStyle = 'white';
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(image,0,0,canvas.width,canvas.height);
      const encoded = canvas.toDataURL('image/jpeg',0.9);
      if (encoded.length > 6000000) throw Error('영수증 부분만 잘라 다시 선택해 주세요.');
      const {data:{session}} = await window.travelPage.client.auth.getSession();
      if (!session) throw Error('여행 사이트에 다시 로그인해 주세요.');
      const res = await fetch('https://gqttecguoftuwjanunry.supabase.co/functions/v1/travel-receipt',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},
        body:JSON.stringify({image:encoded,consent:true,request_id:crypto.randomUUID()}),
        signal:AbortSignal.timeout(70000)
      });
      const data = await res.json();
      if (!res.ok || !data.draft) throw Error(data.error || '인식하지 못했어요. 직접 입력하거나 다시 시도해 주세요.');
      const draft = data.draft;
      fields.merchant.value = draft.merchant;
      fields.category.value = draft.category;
      fields.original.value = draft.amount ?? '';
      fields.currency.value = draft.currency ?? '';
      calculate();
      status.textContent = ['읽은 내용을 확인해 주세요.', ...draft.warnings].join(' ');
      review.hidden = false;
    } catch (err) {
      status.textContent = err.name === 'TimeoutError' ? '응답이 늦어 중단했어요. 다시 시도해 주세요.' : err.message;
    } finally {
      URL.revokeObjectURL(url);
      file.disabled = false;
      file.value = '';
    }
  });
  form.addEventListener('reset', () => {review.hidden=true;review.reset();status.textContent='';panel.open=false;});
})();
