/* CareNest browser-only application state and page controllers. */
(() => {
  const KEYS = {
    users: "carenest_users",
    session: "carenest_session",
    bookings: "carenest_bookings",
    doctors: "carenest_doctors",
    pending: "carenest_pending_booking",
  };
  const get = (key, fallback) =>
    JSON.parse(localStorage.getItem(key)) ?? fallback;
  const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const today = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  function seed() {
    if (!localStorage.getItem(KEYS.users)) set(KEYS.users, CareNestData.users);
    const savedDoctors = get(KEYS.doctors, []);
    set(
      KEYS.doctors,
      CareNestData.doctors.map((doctor) => ({
        ...(savedDoctors.find((saved) => saved.id === doctor.id) || {}),
        ...doctor,
      })),
    );
    if (!localStorage.getItem(KEYS.bookings)) set(KEYS.bookings, []);
  }
  const doctors = () => get(KEYS.doctors, []);
  const avatar = (doctor) => `<div class="avatar">${doctor.image}</div>`;
  function requireSession() {
    if (
      !get(KEYS.session, null) &&
      !location.pathname.endsWith("/index.html") &&
      location.pathname !== "/"
    )
      location.href = "index.html";
  }
  function setupAuth() {
    document.querySelectorAll(".tab-button").forEach((button) =>
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".tab-button")
          .forEach((b) => b.classList.toggle("is-active", b === button));
        document
          .querySelectorAll(".auth-form")
          .forEach((f) =>
            f.classList.toggle("is-hidden", f.id !== button.dataset.formTarget),
          );
      }),
    );
    const ageOn = (date) => {
      const birth = new Date(`${date}T00:00:00`);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const beforeBirthday =
        now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() &&
          now.getDate() < birth.getDate());
      return age - Number(beforeBirthday);
    };
    const validateSignup = (values, users) => {
      const errors = {};
      if (!/^[A-Za-z ]{3,50}$/.test(values.name.trim()))
        errors.name = "Use 3–50 alphabetic characters and spaces only.";
      if (!/^(010|011|012|013|015)\d{8}$/.test(values.phone))
        errors.phone =
          "Enter an 11-digit Egyptian number starting 010, 011, 012, 013, or 015.";
      else if (users.some((u) => u.phone === values.phone))
        errors.phone = "This phone number is already registered.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
        errors.email = "Enter a valid email address.";
      else if (
        users.some((u) => u.email.toLowerCase() === values.email.toLowerCase())
      )
        errors.email = "This email address is already registered.";
      if (
        !values.dateOfBirth ||
        new Date(`${values.dateOfBirth}T00:00:00`) >= new Date() ||
        ageOn(values.dateOfBirth) < 17
      )
        errors.dateOfBirth =
          "You must be at least 17 years old and use a past date.";
      if (!values.gender) errors.gender = "Please select your gender.";
      if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,20}$/.test(
          values.password,
        )
      )
        errors.password =
          "Use 8–20 characters with uppercase, lowercase, number, and !@#$%^&*.";
      if (values.confirmPassword !== values.password || !values.confirmPassword)
        errors.confirmPassword = "Passwords must match exactly.";
      return errors;
    };
    document.querySelectorAll("[data-auth-form]").forEach((form) =>
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const message = form.querySelector(".form-message");
        let users = get(KEYS.users, []);
        message.textContent = "";
        form
          .querySelectorAll(".field-error")
          .forEach((error) => (error.textContent = ""));
        form
          .querySelectorAll("input, select")
          .forEach((field) => field.removeAttribute("aria-invalid"));
        if (form.dataset.authForm === "signup") {
          const errors = validateSignup(values, users);
          Object.entries(errors).forEach(([field, error]) => {
            form.querySelector(`[data-error-for="${field}"]`).textContent =
              error;
            form.elements[field].setAttribute("aria-invalid", "true");
          });
          if (Object.keys(errors).length) {
            message.textContent = "Please correct the highlighted fields.";
            return;
          }
          const { confirmPassword, ...patient } = values;
          const user = { id: crypto.randomUUID(), ...patient };
          users.push(user);
          set(KEYS.users, users);
          set(KEYS.session, { id: user.id, name: user.name });
        } else {
          const rawIdentifier = values.identifier.trim(),
            identifier = rawIdentifier.toLowerCase();
          const userIndex = users.findIndex(
            (u) =>
              u.email.toLowerCase() === identifier || u.phone === rawIdentifier,
          );
          let user = users[userIndex];
          const now = Date.now();
          if (user?.lockUntil) {
            if (user.lockUntil > now)
              return (message.textContent =
                "Account locked due to multiple failed attempts. Please try again in 15 minutes.");
            user = { ...user, failedLoginAttempts: 0, lockUntil: null };
            users[userIndex] = user;
            set(KEYS.users, users);
          }
          if (!user || user.password !== values.password) {
            if (user) {
              const attempts = (user.failedLoginAttempts || 0) + 1;
              users[userIndex] = {
                ...user,
                failedLoginAttempts: attempts,
                lockUntil: attempts >= 3 ? now + 15 * 60 * 1000 : null,
              };
              set(KEYS.users, users);
              if (attempts >= 3)
                return (message.textContent =
                  "Account locked due to multiple failed attempts. Please try again in 15 minutes.");
            }
            return (message.textContent = "Invalid email/phone or password.");
          }
          users[userIndex] = {
            ...user,
            failedLoginAttempts: 0,
            lockUntil: null,
          };
          set(KEYS.users, users);
          set(KEYS.session, { id: user.id, name: user.name });
        }
        location.href = "doctors.html";
      }),
    );
  }
  function renderDoctors() {
    const list = document.querySelector("#doctor-list");
    if (!list) return;
    const specialty = document.querySelector("#specialty-filter"),
      area = document.querySelector("#area-filter"),
      minPrice = document.querySelector("#min-price"),
      maxPrice = document.querySelector("#max-price"),
      filterError = document.querySelector("#filter-error");
    [...new Set(doctors().map((d) => d.specialty))].forEach((value) =>
      specialty.insertAdjacentHTML(
        "beforeend",
        `<option value="${value}">${value}</option>`,
      ),
    );
    [...new Set(doctors().map((d) => d.area))].forEach((value) =>
      area.insertAdjacentHTML(
        "beforeend",
        `<option value="${value}">${value}</option>`,
      ),
    );
    const draw = () => {
      const q = document
          .querySelector("#doctor-search")
          .value.trim()
          .toLowerCase(),
        min = minPrice.value === "" ? 50 : Number(minPrice.value),
        max = maxPrice.value === "" ? 2000 : Number(maxPrice.value);
      filterError.textContent = "";
      if (min < 50 || max > 2000 || min > max) {
        filterError.textContent =
          min > max
            ? "Minimum price cannot be greater than maximum price."
            : "Price must be between $50 and $2000.";
        list.innerHTML =
          '<p class="empty-state">No doctors found matching your criteria.</p>';
        return;
      }
      const matches = doctors().filter(
        (d) =>
          (!specialty.value || d.specialty === specialty.value) &&
          (!area.value || d.area === area.value) &&
          d.fee >= min &&
          d.fee <= max &&
          `${d.name} ${d.specialty}`.toLowerCase().includes(q),
      );
      list.innerHTML = matches.length
        ? matches
            .map(
              (d) =>
                `<article class="doctor-card">${avatar(d)}<div class="doctor-card__body"><p class="specialty">${d.specialty}</p><h2>${d.name}</h2><p class="muted">${d.clinic} · ${d.area}</p><p class="rating">★ ${d.rating} <span>(${d.reviews} reviews)</span></p><div class="card-footer"><strong>$${d.fee}</strong><a class="button button--outline" href="doctor-details.html?id=${d.id}">View profile</a></div></div></article>`,
            )
            .join("")
        : '<p class="empty-state">No doctors found matching your criteria.</p>';
    };
    [
      document.querySelector("#doctor-search"),
      specialty,
      area,
      minPrice,
      maxPrice,
    ].forEach((control) => control.addEventListener("input", draw));
    specialty.addEventListener("change", draw);
    area.addEventListener("change", draw);
    draw();
  }
  function renderDetails() {
    const root = document.querySelector("#doctor-details");
    if (!root) return;
    const doctor =
      doctors().find(
        (d) => d.id === new URLSearchParams(location.search).get("id"),
      ) || doctors()[0];
    const session = get(KEYS.session, null);
    const toISODate = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const formatDate = (date) =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }).format(new Date(`${date}T00:00:00`));
    const isPastTime = (date, time) => {
      if (date !== today()) return false;
      const [clock, meridiem] = time.split(" ");
      let [hour, minute] = clock.split(":").map(Number);
      hour = (hour % 12) + (meridiem === "PM" ? 12 : 0);
      const slotTime = new Date();
      slotTime.setHours(hour, minute, 0, 0);
      return slotTime <= new Date();
    };
    const dates = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + offset);
      return toISODate(date);
    });
    let selectedSlot = null;
    const bookedSlots = get(KEYS.bookings, []);
    const slotGrid = dates
      .map(
        (date) =>
          `<section class="day-slots"><h3>${formatDate(date)}</h3><div class="slot-list">${doctor.slots
            .map((time) => {
              const booked = bookedSlots.some(
                (booking) =>
                  booking.doctorId === doctor.id &&
                  booking.date === date &&
                  booking.time === time &&
                  booking.userId !== session?.id,
              );
              const unavailable = booked || isPastTime(date, time);
              return `<button type="button" class="slot-button ${booked ? "is-booked" : ""}" data-date="${date}" data-slot="${time}" ${unavailable ? "disabled" : ""}>${time}${booked ? "<small>Booked</small>" : ""}</button>`;
            })
            .join("")}</div></section>`,
      )
      .join("");
    root.innerHTML = `<a class="back-link" href="doctors.html">← Back to doctors</a><div class="details-layout"><section><article class="profile-card">${avatar(doctor)}<div><p class="specialty">${doctor.specialty}</p><h1>${doctor.name}</h1><p>${doctor.clinic} · ${doctor.area}</p><p>Consultation fee: <strong>$${doctor.fee}</strong> · ${doctor.experience} years experience</p><p class="rating">★ ${doctor.rating} (${doctor.reviews} reviews)</p></div></article><section class="about-section"><h2>About</h2><p>${doctor.about}</p></section></section><aside class="booking-panel booking-panel--slots"><h2>Choose a time</h2><p class="muted">Available appointments for the next 7 days.</p><div id="slot-list">${slotGrid}</div><button id="continue-booking" class="button button--primary" disabled>Continue · $${doctor.fee}</button></aside></div>`;
    root.querySelectorAll(".slot-button:not(:disabled)").forEach((button) =>
      button.addEventListener("click", () => {
        root
          .querySelectorAll(".slot-button")
          .forEach((slot) =>
            slot.classList.toggle("is-selected", slot === button),
          );
        selectedSlot = { date: button.dataset.date, time: button.dataset.slot };
        root.querySelector("#continue-booking").disabled = false;
      }),
    );
    root.querySelector("#continue-booking").addEventListener("click", () => {
      if (!selectedSlot) return;
      set(KEYS.pending, { doctorId: doctor.id, ...selectedSlot });
      location.href = "checkout.html";
    });
  }
  function checkout() {
    const summary = document.querySelector("#checkout-summary");
    if (!summary) return;
    const pending = get(KEYS.pending, null),
      doctor = pending && doctors().find((d) => d.id === pending.doctorId),
      session = get(KEYS.session, null),
      user = get(KEYS.users, []).find((account) => account.id === session?.id);
    if (!doctor || !session) return (location.href = "doctors.html");
    let discount = 0,
      promoApplied = false,
      promoCode = "";
    const total = () => Math.max(0, doctor.fee - discount);
    const draw = () =>
      (summary.innerHTML = `${avatar(doctor)}<div><p class="specialty">${doctor.specialty}</p><h2>${doctor.name}</h2><p>${pending.date} · ${pending.time}</p><p>${doctor.clinic}, ${doctor.area}</p></div><hr><p>Consultation fee <strong>${doctor.fee} EGP</strong></p><p>Discount <strong>−${discount} EGP</strong></p><p class="total">Total <strong>${total()} EGP</strong></p>`);
    const clearErrors = () =>
      document
        .querySelectorAll("[data-checkout-error]")
        .forEach((error) => (error.textContent = ""));
    const setError = (field, text) =>
      (document.querySelector(`[data-checkout-error="${field}"]`).textContent =
        text);
    const patientType = () =>
      document.querySelector('input[name="patient-type"]:checked').value;
    const payment = () =>
      document.querySelector('input[name="payment"]:checked').value;
    const updatePatientFields = () =>
      document
        .querySelector("#other-patient-fields")
        .classList.toggle("is-hidden", patientType() === "self");
    const updateCardFields = () =>
      document
        .querySelector("#card-fields")
        .classList.toggle("is-hidden", payment() !== "card");
    const createReference = (bookings) => {
      let reference;
      do {
        reference = `BK${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
      } while (bookings.some((booking) => booking.reference === reference));
      return reference;
    };
    draw();
    document
      .querySelectorAll('input[name="patient-type"]')
      .forEach((input) =>
        input.addEventListener("change", updatePatientFields),
      );
    document
      .querySelectorAll('input[name="payment"]')
      .forEach((input) => input.addEventListener("change", updateCardFields));
    document.querySelector("#apply-promo").addEventListener("click", () => {
      const input = document.querySelector("#promo-code"),
        message = document.querySelector("#promo-message"),
        code = input.value.trim().toUpperCase();
      if (promoApplied)
        return (message.textContent =
          "A promo code has already been applied to this booking.");
      if (
        !/^[A-Z0-9]{1,10}$/.test(code) ||
        !["SAVE10", "FLAT50"].includes(code)
      )
        return (message.textContent = "Invalid or expired promo code.");
      promoCode = code;
      discount = code === "SAVE10" ? 10 : 50;
      promoApplied = true;
      input.disabled = true;
      document.querySelector("#apply-promo").disabled = true;
      message.textContent = `${code} applied successfully.`;
      draw();
    });
    document.querySelector("#confirm-booking").addEventListener("click", () => {
      clearErrors();
      const message = document.querySelector("#checkout-message");
      message.textContent = "";
      let valid = true;
      let patientName = user?.name || "",
        patientPhone = user?.phone || "";
      if (patientType() === "other") {
        patientName = document.querySelector("#patient-name").value.trim();
        patientPhone = document.querySelector("#patient-phone").value.trim();
        if (!/^[A-Za-z ]{3,50}$/.test(patientName)) {
          setError(
            "patient-name",
            "Use 3–50 alphabetic characters and spaces only.",
          );
          valid = false;
        }
        if (!/^(010|011|012|013|015)\d{8}$/.test(patientPhone)) {
          setError("patient-phone", "Enter an 11-digit Egyptian number.");
          valid = false;
        }
      }
      if (payment() === "card") {
        const number = document.querySelector("#card-number").value.trim(),
          expiry = document.querySelector("#card-expiry").value.trim(),
          cvv = document.querySelector("#card-cvv").value.trim();
        if (!/^\d{16}$/.test(number)) {
          setError(
            "card-number",
            "Card number must contain exactly 16 digits.",
          );
          valid = false;
        }
        const match = expiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
        const current = new Date();
        if (
          !match ||
          Number(`20${match[2]}`) < current.getFullYear() ||
          (Number(`20${match[2]}`) === current.getFullYear() &&
            Number(match[1]) < current.getMonth() + 1)
        ) {
          setError(
            "card-expiry",
            "Use a valid current or future expiry date (MM/YY).",
          );
          valid = false;
        }
        if (!/^\d{3}$/.test(cvv)) {
          setError("card-cvv", "CVV must contain exactly 3 digits.");
          valid = false;
        }
      }
      if (!valid) {
        message.textContent = "Please correct the highlighted fields.";
        return;
      }
      const bookings = get(KEYS.bookings, []);
      if (
        bookings.some(
          (booking) =>
            booking.doctorId === doctor.id &&
            booking.date === pending.date &&
            booking.time === pending.time,
        )
      )
        return (message.textContent =
          "This slot has just been booked. Please choose another time.");
      const booking = {
        id: crypto.randomUUID(),
        reference: createReference(bookings),
        userId: session.id,
        ...pending,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        clinic: doctor.clinic,
        clinicAddress: `${doctor.clinic}, ${doctor.area}`,
        patientName,
        patientPhone,
        promoCode: promoCode || null,
        discount,
        total: total(),
        paymentMethod:
          payment() === "card" ? "Credit Card" : "Pay at Clinic (Cash)",
        status: "Confirmed",
      };
      bookings.push(booking);
      set(KEYS.bookings, bookings);
      localStorage.removeItem(KEYS.pending);
      document.querySelector("#receipt-details").innerHTML =
        `<p><strong>Booking ID:</strong> #${booking.reference}</p><p><strong>Patient:</strong> ${user?.name || booking.patientName}</p><p><strong>${booking.doctorName}</strong><br>${booking.date} · ${booking.time}</p><p>${booking.clinicAddress}</p><p><strong>${booking.total} EGP</strong> · ${booking.paymentMethod}</p>`;
      document
        .querySelector("#confirmation-modal")
        .classList.remove("is-hidden");
    });
  }
  function bookings() {
    const upcomingRoot = document.querySelector("#upcoming-bookings"),
      pastRoot = document.querySelector("#past-bookings");
    if (!upcomingRoot || !pastRoot) return;
    const session = get(KEYS.session, null),
      cancelModal = document.querySelector("#cancel-modal");
    let bookingToCancel = null;
    const appointmentDate = (booking) => {
      const [clock, meridiem] = booking.time.split(" ");
      let [hours, minutes] = clock.split(":").map(Number);
      hours = (hours % 12) + (meridiem === "PM" ? 12 : 0);
      const date = new Date(`${booking.date}T00:00:00`);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };
    const empty = (text) => `<div class="empty-state"><p>${text}</p></div>`;
    const card = (booking) => {
      const appointment = appointmentDate(booking),
        cancellable = booking.status === "Confirmed",
        disabledTitle =
          "Cancellations are only allowed up to 24 hours before the appointment.";
      return `<article class="booking-card"><div><p class="specialty">${booking.specialty}</p><h2>${booking.doctorName}</h2><p>${booking.clinicAddress || booking.clinic}</p>${booking.reference ? `<p class="booking-reference">#${booking.reference}</p>` : ""}</div><div class="booking-meta"><strong>${booking.date}</strong><span>${booking.time}</span><span class="status ${booking.status === "Cancelled" ? "status--cancelled" : ""}">${booking.status}</span></div>${booking.status === "Confirmed" ? `<button class="button button--danger" data-cancel="${booking.id}" ${cancellable ? "" : `disabled title="${disabledTitle}"`}>Cancel booking</button>` : ""}</article>`;
    };
    const draw = () => {
      const items = get(KEYS.bookings, []).filter(
          (booking) => booking.userId === session.id,
        ),
        now = Date.now();
      const upcoming = items.filter(
          (booking) =>
            booking.status === "Confirmed" &&
            appointmentDate(booking).getTime() >= now,
        ),
        pastOrCancelled = items.filter(
          (booking) =>
            booking.status === "Cancelled" ||
            appointmentDate(booking).getTime() < now,
        );
      upcomingRoot.innerHTML = upcoming.length
        ? upcoming.map(card).join("")
        : empty("No upcoming bookings.");
      pastRoot.innerHTML = pastOrCancelled.length
        ? pastOrCancelled.map(card).join("")
        : empty("No past or cancelled bookings.");
      document
        .querySelectorAll("[data-cancel]:not(:disabled)")
        .forEach((button) =>
          button.addEventListener("click", () => {
            bookingToCancel = button.dataset.cancel;
            cancelModal.classList.remove("is-hidden");
          }),
        );
    };
    document.querySelector("#dismiss-cancel").addEventListener("click", () => {
      bookingToCancel = null;
      cancelModal.classList.add("is-hidden");
    });
    document.querySelector("#confirm-cancel").addEventListener("click", () => {
      if (!bookingToCancel) return;
      set(
        KEYS.bookings,
        get(KEYS.bookings, []).map((booking) =>
          booking.id === bookingToCancel
            ? {
                ...booking,
                status: "Cancelled",
                cancelledAt: new Date().toISOString(),
              }
            : booking,
        ),
      );
      bookingToCancel = null;
      cancelModal.classList.add("is-hidden");
      draw();
    });
    draw();
  }
  function globalUI() {
    document.querySelectorAll("[data-logout]").forEach((b) =>
      b.addEventListener("click", () => {
        localStorage.removeItem(KEYS.session);
        location.href = "index.html";
      }),
    );
  }
  seed();
  requireSession();
  globalUI();
  setupAuth();
  renderDoctors();
  renderDetails();
  checkout();
  bookings();
})();
