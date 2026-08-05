# VillaRental → Supabase & Next.js Web Migration Summary

**Ημερομηνία & Ώρα**: 5 Αυγούστου 2026
**Έργο**: VillaRental (Μεταφορά από SQL Server & .NET MAUI σε Supabase & Next.js 14 + Vercel)

---

## 1. 🗄️ Βάση Δεδομένων (Supabase / PostgreSQL)

- **Πηγή**: SQL Server Dump (`Villa_Rentals.sql`).
- **Προορισμός**: Live Supabase PostgreSQL project (`https://qfmltxeattdcdetbrcie.supabase.co`).
- **Script Μετατροπής & Εισαγωγής**: [`C:\Users\CSKIN\VillaRental\Supabase\supabase-schema-from-sqlserver.sql`](file:///C:/Users/CSKIN/VillaRental/Supabase/supabase-schema-from-sqlserver.sql).
- **Πίνακες (15 συνολικά)**:
  1. `nationality` (Εθνικότητες)
  2. `countries` (Χώρες)
  3. `cities` (Πόλεις)
  4. `city_to_country`
  5. `customers` (Πελάτες)
  6. `platforms` (Πλατφόρμες: FeWo-direkt, VRBO, Expedia, Abritel κλπ.)
  7. `houses` (Σπίτια/Βίλες)
  8. `owners` (Ιδιοκτήτες)
  9. `house_owners` (Ποσοστά ιδιοκτησίας)
  10. `managers` (Διαχειριστές)
  11. `manager_to_house` (Αντιστοίχιση Διαχειριστών - Σπιτιών)
  12. `owner_group`
  13. `reservations` (Κρατήσεις)
  14. `tax_klimaka` (Φορολογικές κλίμακες)
  15. `tax_klimaka_items`
- **Views**: `tbl_reservations_data`
- **Δεδομένα**: **188+ εγγραφές** μεταφέρθηκαν με επιτυχία.
- **Διαπιστευτήρια (Supabase Credentials)**:
  - **URL**: `https://qfmltxeattdcdetbrcie.supabase.co`
  - **Anon Key**: `sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA`

---

## 2. 💻 Νέα Web Εφαρμογή (Next.js 14 + TailwindCSS)

- **Διαδρομή Project**: [`C:\Users\CSKIN\VillaRentalWeb`](file:///C:/Users/CSKIN\VillaRentalWeb)
- **Τεχνολογίες**: Next.js 14 (App Router), TypeScript, TailwindCSS, Lucide Icons, `@supabase/supabase-js`.
- **Κατάσταση Build**: `npm run build` ολοκληρώθηκε επιτυχώς με **0 σφάλματα**.

---

## 3. 🔐 Σύστημα Αυθεντικοποίησης & Ρόλων (Login & Roles)

### 3.1 Σελίδα Login (`/login`)
- **Fortio Split-Panel UI**:
  - **Αριστερό Panel (Desktop)**: Hero branding section, badges, στατιστικά.
  - **Δεξί Panel**: Φόρμα σύνδεσης, επιλογέας ρόλου (Manager / Owner), πεδία username/email & password, Google login option.
  - **Εναλλαγή Dark / Light Mode**: Κουμπί εναλλαγής θέματος (Ήλιος / Σελήνη) πάνω δεξιά.
  - **Quick Demo Presets**:
    - **Alex (Manager)**: Σύνδεση ως διαχειριστής (`alex@gmail.com`).
    - **Κωνσταντίνος Σκινδήλιας (Owner)**: Σύνδεση ως ιδιοκτήτης (`skinkon@gmail.com`).

### 3.2 Κανόνες Πρόσβασης ανά Ρόλο
1. **Διαχειριστής (Manager)**:
   - Βλέπει όλα τα σπίτια που του έχουν ανατεθεί μέσω του πίνακα **`manager_to_house`** (`f_manager_aid` ➔ `f_house_aid`).
2. **Ιδιοκτήτης (Owner)**:
   - Βλέπει αποκλειστικά τα δικά του σπίτια μέσω του πίνακα `house_owners` (`f_owner_aid` ➔ `f_house_aid`).
   - **Δύο Μορφές Προβολής στο Header Dropdown**:
     - **«Συνολική (Όλα τα Σπίτια)»**: Όλες οι κρατήσεις για όλα τα σπίτια του ιδιοκτήτη.
     - **«Συγκεκριμένο Σπίτι»**: Φιλτράρισμα για ένα συγκεκριμένο σπίτι.

---

## 4. 🚀 Οδηγίες Εκτέλεσης

### Εκτέλεση Τοπικά:
```bash
cd C:\Users\CSKIN\VillaRentalWeb
npm run dev
```
Browser: **`http://localhost:3000/login`**

### Ανέβασμα στο Vercel:
1. Push του `VillaRentalWeb` στο GitHub ή εκτέλεση `npx vercel` μέσα στο `VillaRentalWeb`.
2. Προσθήκη Environment Variables στο Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://qfmltxeattdcdetbrcie.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_luRxRKOVoPW09H5GFlbtmQ_9KlP-xbA`
