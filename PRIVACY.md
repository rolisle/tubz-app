# Tubz — Privacy Policy

**Effective date:** 15 April 2026
**Last updated:** 1 May 2026

This Privacy Policy describes how the Tubz mobile application ("Tubz", "the
app", "we", "our", or "us") handles information when you use it. By using the
app you agree to the practices described below.

If you have any questions, contact us at **[YOUR CONTACT EMAIL]**.

---

## 1. Summary (TL;DR)

- Tubz is a **local-only** stock tracking tool for vending machines.
- All data you enter stays **on your device**.
- We do **not** run servers, we do **not** have user accounts, and we do
  **not** collect, sell, or share your personal information.
- We do **not** use analytics, advertising, tracking SDKs, or crash
  reporting services.
- The routine network use is (1) opening Google Maps when you tap a
  location address, (2) app store / Expo update checks, and (3) **only if
  you use it** — the optional **Expo push** test in the dashboard test menu
  (see [§6](#6-third-party-services)).

---

## 2. Information We Do Not Collect

We do not collect any of the following:

- Name, email address, phone number, or any account credentials.
- Device identifiers (advertising ID, IMEI, MAC address, etc.).
- Precise or coarse geolocation.
- Contacts, SMS, call logs, or calendar data.
- Usage analytics, behavioural data, or diagnostic telemetry.
- Any form of biometric or health information.

Tubz has no back-end server and no login system. Nothing you enter leaves
your device unless you explicitly export it.

---

## 3. Information You Create Locally

You may enter information into the app which is stored **only on your
device**, inside the operating system's sandboxed storage (Android
AsyncStorage / app-private storage):

- **Locations** — site name, address, city, postcode, opening hours, notes,
  and optionally a **one-week reminder anchor** (timestamp) when you use that
  restock option — stored only for due-date calculation on the device.
- **Machines** — machine type and product layout per location.
- **Products** — product names, emojis, categories, and optional images
  you choose from your photo library.
- **Restock history** — dates, product lists, and quantities for each
  restock session.
- **Stock levels** — current fullness state per product.
- **App settings** — theme, accent colour, and notification preferences.

This data is not transmitted to us or to any third party. Uninstalling the
app deletes it.

---

## 4. Permissions We Request

Android may request the following permissions. We request them only for
the functions described here; we never use them for any other purpose.

### Camera (`android.permission.CAMERA`)

used when you tap "Take Photo" in the product editor to capture a new image for a product. Photos you capture are stored only on your device and are not uploaded anywhere.

### Photos / media access (`READ_MEDIA_IMAGES`)

Used when you tap "Upload image" on a product so you can pick an existing
photo as that product's thumbnail. The selected image is copied into the
app's private storage on your device and is not uploaded anywhere.

### Notifications (`POST_NOTIFICATIONS`)

Used to deliver **local** reminder notifications for upcoming restock
dates at locations you have configured. Restock reminders are scheduled and
delivered on-device; their **content** is not sent to us. (A separate,
**optional** developer/QA control can request an **Expo push token** and
trigger a **test** notification via Expo’s servers — see [§6](#6-third-party-services).)

### Exact alarms (`SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`)

Used to schedule restock reminder notifications at a precise date and
time (for example the configured reminder date for a location). Android 12
and above may require special handling for exact-time alarms. These
permissions are used **only** for local, on-device restock reminders; no
schedule data is sent to us as a result of granting them.

### Internet (`INTERNET`)

Standard permission required by React Native / Expo apps. Tubz uses the
network for:

- Opening Google Maps in your browser or Maps app when you tap an address.
- Standard OS-level app store and Expo update checks.
- **Optional:** if you use the dashboard **test menu → Expo push** flow on
  a **device build**, the app contacts **Expo** (and on Android may use
  **Google Firebase Cloud Messaging** as configured in the app) to obtain a
  push token and to **send a test notification** you request. That path is
  not used for ordinary restock reminders.

---

## 5. Export, Import, and Sharing

Tubz includes an **Export** feature which writes your locations, products,
and restock history to a JSON file and hands it to your operating
system's share sheet. From there, you decide where the file goes
(e.g. email, cloud storage, another device). Tubz does not upload the
file on your behalf.

The **Import** feature reads a JSON file you pick from your device and
merges its contents into the app's local storage.

Any data you share via export becomes subject to the privacy practices of
the destination you send it to (email provider, cloud storage, etc.).

---

## 6. Third-Party Services

Tubz does **not** integrate any third-party analytics, advertising, or
user-tracking SDKs. The external endpoints the app may contact include:

- **maps.google.com** — opened in your external browser or Google Maps
  app when you tap a location's address. This is a link-out, not a
  background request. Google's privacy practices apply once you leave
  the app.
- **Expo update servers / Google Play** — standard app distribution and
  update checks. These are handled by the OS and Expo's SDK and are
  subject to their respective privacy policies.
- **exp.host (Expo push API)** — **only** if you open the dashboard **test
  menu** and use the **Expo push** test on a supported device build. The
  app sends your **Expo push token** (not your Tubz inventory data) to
  Expo’s service so a **single test notification** can be delivered.
  **Google (FCM)** may be involved on Android for that token/delivery path,
  as with typical Expo-managed apps using Firebase configuration.

We have no control over, and accept no responsibility for, the privacy
practices of these third parties.

---

## 7. Children's Privacy

Tubz is intended for use by businesses and adults managing vending
inventory. It is not directed at children under the age of 13 (or the
equivalent minimum age in your jurisdiction), and we do not knowingly
collect any information from children.

---

## 8. Data Security

Because all app data is stored locally in the operating system's
sandboxed app storage, its security depends primarily on the security of
your device (screen lock, disk encryption, etc.). Uninstalling the app
removes all app-stored data.

---

## 9. Your Rights

Since we do not hold any personal information about you on any server,
there is nothing for us to delete, correct, or provide on request. You
can manage your locally stored data at any time by:

- Deleting individual locations, machines, products, or restock entries
  from within the app.
- Clearing the app's storage from your device's Settings.
- Uninstalling the app, which erases all locally stored data.

---

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. Material changes
will be reflected by updating the "Last updated" date at the top of this
document. Continued use of the app after an update constitutes
acceptance of the revised policy.

---

## 11. Contact

If you have any questions about this Privacy Policy or the app's
handling of data, contact:

**Robbie L**
Email: **domaxsyt@gmail.com**
