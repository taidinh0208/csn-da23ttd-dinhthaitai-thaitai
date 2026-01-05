/* script.js - xử lý đăng nhập/register, booking, in hóa đơn, SMS mô phỏng */
document.addEventListener('DOMContentLoaded', () => {
    // set years
    const years = ['year','year2','year3','year4','year5'];
    years.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.textContent = (new Date()).getFullYear();
    });

    // Simple user auth (LocalStorage)
    const usersKey = 'vinawash_users_v1';
    const sessionsKey = 'vinawash_session_v1';
    const bookingsKey = 'vinawash_bookings_v1';

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(usersKey) || '[]'); }
        catch(e) { return []; }
    }
    function saveUsers(u){ localStorage.setItem(usersKey, JSON.stringify(u)); }
    function setSession(phone) { localStorage.setItem(sessionsKey, phone); }
    function getSession() { return localStorage.getItem(sessionsKey); }
    function clearSession() { localStorage.removeItem(sessionsKey); }

    // auth link on nav
    function updateAuthLinks() {
        const session = getSession();
        const authLink = document.getElementById('auth-link');
        const authLink2 = document.getElementById('auth-link-2');
        if(session) {
            if(authLink) { authLink.textContent = 'Tài khoản'; authLink.href = '#'; }
            if(authLink2) { authLink2.textContent = 'Tài khoản'; authLink2.href = '#'; }
        }
    }
    updateAuthLinks();

    // REGISTER
    const regForm = document.getElementById('register-form');
    if(regForm){
        regForm.addEventListener('submit', e => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const pass = document.getElementById('reg-pass').value;
            const msg = document.getElementById('reg-msg');

            const users = getUsers();
            if(users.some(u => u.phone === phone)) {
                msg.textContent = 'Số điện thoại đã được đăng ký.';
                msg.style.color = 'red';
                return;
            }
            users.push({name, phone, pass});
            saveUsers(users);
            msg.textContent = 'Đăng ký thành công. Bạn có thể đăng nhập ngay.';
            msg.style.color = 'green';
            setTimeout(()=>{ window.location.href = 'login.html'; }, 900);
        });
    }

    // LOGIN
    const loginForm = document.getElementById('login-form');
    if(loginForm){
        loginForm.addEventListener('submit', e => {
            e.preventDefault();
            const phone = document.getElementById('login-phone').value.trim();
            const pass = document.getElementById('login-pass').value;
            const msg = document.getElementById('login-msg');

            const users = getUsers();
            const found = users.find(u => u.phone === phone && u.pass === pass);
            if(found) {
                setSession(found.phone);
                msg.textContent = 'Đăng nhập thành công. Chuyển hướng...';
                msg.style.color = 'green';
                setTimeout(()=>{ window.location.href = 'booking.html'; }, 800);
            } else {
                msg.textContent = 'Sai số điện thoại hoặc mật khẩu.';
                msg.style.color = 'red';
            }
        });
    }

    // Booking functions
    function loadBookings() {
        try { return JSON.parse(localStorage.getItem(bookingsKey) || '[]'); }
        catch(e) { return []; }
    }
    function saveBookings(list) { localStorage.setItem(bookingsKey, JSON.stringify(list)); }

    // Booking form
    const bookingForm = document.getElementById('booking-form');
    if(bookingForm){
        bookingForm.addEventListener('submit', e => {
            e.preventDefault();
            const service = document.getElementById('service').value;
            const branch = document.getElementById('branch').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;
            const name = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const note = document.getElementById('note').value.trim();

            if(!service || !branch || !date || !time || !name || !phone) {
                alert('Vui lòng điền đầy đủ thông tin.');
                return;
            }

            const bookings = loadBookings();
            const id = 'BKG-' + Date.now();
            const createdAt = new Date().toISOString();
            const amount = computeAmount(service);
            const booking = { id, service, branch, date, time, name, phone, note, createdAt, status:'Đã đặt', amount };
            bookings.push(booking);
            saveBookings(bookings);

            renderBookingsList();
            bookingForm.reset();

            // simulate SMS
            sendSMS(phone, `VinaWash: Xác nhận đặt lịch ${service} vào ${date} ${time}. Mã: ${id}`);

            alert('Đặt lịch thành công! Mã: ' + id);
        });

        document.getElementById('clear-form').addEventListener('click', ()=> bookingForm.reset());
    }

    function computeAmount(serviceText) {
        // simple parsing of amount from text (if present)
        const m = serviceText.match(/(\d{1,3}(?:,\d{3})?)[₫]?|(\d+)/);
        // but as values are in label, fallback simple mapping:
        const map = {
            'Rửa xe thường': 120000,
            'Rửa xe cao cấp': 180000,
            'Vệ sinh nội thất': 300000,
            'Vệ sinh khoang máy': 150000
        };
        // serviceText may include price suffix; we search map keys
        for(const k in map) if(serviceText.indexOf(k) !== -1) return map[k];
        // fallback 150k
        return 150000;
    }

    // render bookings list (for booking page)
    function renderBookingsList() {
        const container = document.getElementById('bookings-list');
        if(!container) return;
        const bookings = loadBookings().sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
        container.innerHTML = '';
        if(bookings.length === 0) {
            container.innerHTML = '<div class="help-text">Chưa có lịch hẹn.</div>';
            return;
        }
        bookings.forEach(b => {
            const row = document.createElement('div');
            row.className = 'booking-row';
            row.innerHTML = `
                <div class="booking-info">
                    <strong>${b.service}</strong> • <small>${b.branch}</small><br/>
                    <small>${b.date} ${b.time} • ${b.name} • ${b.phone}</small>
                </div>
                <div class="booking-actions">
                    <button class="secondary-button btn-view" data-id="${b.id}">Xem</button>
                    <button class="secondary-button btn-invoice" data-id="${b.id}">In hóa đơn</button>
                    <button class="secondary-button btn-cancel" data-id="${b.id}">Hủy</button>
                </div>
            `;
            container.appendChild(row);
        });

        // attach handlers
        container.querySelectorAll('.btn-cancel').forEach(btn => {
            btn.addEventListener('click', (e)=>{
                const id = e.currentTarget.dataset.id;
                if(!confirm('Bạn có chắc muốn hủy lịch này?')) return;
                let bookings = loadBookings();
                bookings = bookings.filter(x => x.id !== id);
                saveBookings(bookings);
                renderBookingsList();
                alert('Đã hủy lịch');
            });
        });
        container.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e)=>{
                const id = e.currentTarget.dataset.id;
                const bookings = loadBookings();
                const b = bookings.find(x=>x.id===id);
                if(!b) return alert('Không tìm thấy.');
                alert(`Chi tiết:\nMã: ${b.id}\nDịch vụ: ${b.service}\nChi nhánh: ${b.branch}\nNgày: ${b.date} ${b.time}\nKhách: ${b.name}\nSĐT: ${b.phone}\nGhi chú: ${b.note || '-'}`);
            });
        });
        container.querySelectorAll('.btn-invoice').forEach(btn=>{
            btn.addEventListener('click', (e)=>{
                const id = e.currentTarget.dataset.id;
                // redirect to invoice page with id param
                window.location.href = `invoice.html?id=${id}`;
            });
        });
    }

    // export bookings
    const exportBtn = document.getElementById('export-bookings');
    if(exportBtn) exportBtn.addEventListener('click', ()=> {
        const data = loadBookings();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'bookings.json'; a.click();
        URL.revokeObjectURL(url);
    });

    const refreshBtn = document.getElementById('refresh-list');
    if(refreshBtn) refreshBtn.addEventListener('click', renderBookingsList);

    renderBookingsList();

    // Invoice page
    function renderBookingsForInvoice() {
        const container = document.getElementById('bookings-for-invoice');
        if(!container) return;
        const bookings = loadBookings();
        container.innerHTML = '';
        if(bookings.length === 0) {
            container.innerHTML = '<div class="help-text">Không có lịch hẹn để in hóa đơn.</div>';
            return;
        }
        bookings.forEach(b => {
            const el = document.createElement('div');
            el.className = 'booking-row';
            el.innerHTML = `<div class="booking-info"><strong>${b.service}</strong><br/><small>${b.date} ${b.time} • ${b.name} • ${b.phone}</small></div>
            <div>
                <button class="secondary-button btn-make" data-id="${b.id}">Tạo hóa đơn</button>
            </div>`;
            container.appendChild(el);
        });

        container.querySelectorAll('.btn-make').forEach(btn=>{
            btn.addEventListener('click', e=>{
                const id = e.currentTarget.dataset.id;
                createInvoiceFor(id);
            });
        });
    }
    renderBookingsForInvoice();

    function createInvoiceFor(id) {
        const bookings = loadBookings();
        const b = bookings.find(x=>x.id===id);
        if(!b) return alert('Không tìm thấy lịch hẹn.');
        const area = document.getElementById('invoice-area');
        if(!area) {
            // maybe we are on booking page - generate printable window
            const html = buildInvoiceHTML(b);
            const w = window.open('', '_blank', 'width=800,height=600');
            w.document.write(html);
            w.document.close();
            return;
        }
        area.style.display = 'block';
        area.innerHTML = buildInvoiceInner(b) + `<div style="margin-top:12px;"><button id="print-invoice" class="cta-button">In</button></div>`;
        document.getElementById('print-invoice').addEventListener('click',()=>{
            const html = buildInvoiceHTML(b);
            const w = window.open('', '_blank', 'width=800,height=600');
            w.document.write(html);
            w.document.close();
        });
    }

    function buildInvoiceInner(b) {
        return `
            <h3>Hóa đơn dịch vụ</h3>
            <div class="invoice-row"><div>Mã hóa đơn</div><div>${b.id}</div></div>
            <div class="invoice-row"><div>Ngày</div><div>${new Date(b.createdAt).toLocaleString()}</div></div>
            <div class="invoice-row"><div>Khách hàng</div><div>${b.name} • ${b.phone}</div></div>
            <div class="invoice-row"><div>Dịch vụ</div><div>${b.service}</div></div>
            <div class="invoice-row"><div>Chi nhánh</div><div>${b.branch}</div></div>
            <div class="invoice-row"><div>Thời gian</div><div>${b.date} ${b.time}</div></div>
            <div class="invoice-row"><div>Tổng</div><div>${formatCurrency(b.amount)}</div></div>
        `;
    }

    function buildInvoiceHTML(b) {
        return `
        <!doctype html>
        <html>
        <head>
            <meta charset="utf-8"/>
            <title>Hóa đơn ${b.id}</title>
            <style>
                body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#222}
                .header{display:flex;justify-content:space-between;align-items:center}
                h1{color:#0b63b3}
                .invoice-row{display:flex;justify-content:space-between;margin:8px 0}
                .total{font-weight:700;margin-top:16px}
                .small{color:#666;font-size:12px}
            </style>
        </head>
        <body>
            <div class="header">
                <div><h1>VinaWash</h1><div class="small">ĐT: 0988-579-068</div></div>
                <div><strong>HÓA ĐƠN DỊCH VỤ</strong></div>
            </div>
            <hr/>
            <div class="invoice-row"><div>Mã</div><div>${b.id}</div></div>
            <div class="invoice-row"><div>Ngày tạo</div><div>${new Date(b.createdAt).toLocaleString()}</div></div>
            <div class="invoice-row"><div>Khách</div><div>${b.name} • ${b.phone}</div></div>
            <div class="invoice-row"><div>Dịch vụ</div><div>${b.service}</div></div>
            <div class="invoice-row"><div>Chi nhánh</div><div>${b.branch}</div></div>
            <div class="invoice-row"><div>Thời gian</div><div>${b.date} ${b.time}</div></div>
            <div class="invoice-row total"><div>Tổng</div><div>${formatCurrency(b.amount)}</div></div>
            <hr/>
            <div class="small">Cảm ơn quý khách đã sử dụng dịch vụ VinaWash. Phiếu có giá trị khi có xác nhận của nhân viên.</div>
            <script>window.print();</script>
        </body>
        </html>
        `;
    }

    function formatCurrency(n) {
        return new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND' }).format(n);
    }

    // Simulated SMS sender: logs and fake fetch
    function sendSMS(phone, text) {
        console.log(`[SMS] to ${phone}: ${text}`);
        // Try fake API call (this will fail on CORS in many contexts but we'll attempt and ignore)
        try {
            fetch('https://example.com/send-sms', {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({to: phone, message: text})
            }).then(()=> {
                console.log('SMS API called (simulated).');
            }).catch(()=> {
                console.log('SMS API not available — simulated only.');
            });
        } catch(e) {
            console.log('SMS simulate error', e);
        }
    }

    // If invoice page opened with id param -> auto render that invoice
    if(window.location.pathname.endsWith('invoice.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if(id) createInvoiceFor(id);
        renderBookingsForInvoice();
    }

    // If booking page -> ensure list rendered (already run)
    if(window.location.pathname.endsWith('booking.html')) {
        renderBookingsList();
    }

    // Simple navigation and logout detection
    // If user is logged in, show a logout option in nav
    function attachLogoutUI() {
        const session = getSession();
        if(!session) return;
        // append logout
        const navs = document.querySelectorAll('.nav');
        navs.forEach(nav => {
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = 'Đăng xuất';
            a.addEventListener('click', (e)=>{
                e.preventDefault();
                if(confirm('Bạn muốn đăng xuất?')){ clearSession(); window.location.href='index.html'; }
            });
            nav.appendChild(a);
        });
    }
    attachLogoutUI();

});
