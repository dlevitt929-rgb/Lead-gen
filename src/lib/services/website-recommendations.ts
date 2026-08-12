// Deterministic, rule-based website feature recommendations by category.
// This always works even with no AI provider configured — the AI sales
// assistant (see ai-sales-assistant.ts) can personalize on top of this when
// available, but the core recommendation never depends on it.

export interface FeatureRecommendation {
  feature: string;
  reason: string;
}

const RECOMMENDATIONS: Record<string, FeatureRecommendation[]> = {
  restaurant: [
    { feature: "Online menu with prices", reason: "Customers decide before they call" },
    { feature: "Table reservation form", reason: "Captures bookings outside of phone hours" },
    { feature: "WhatsApp ordering button", reason: "The channel most diners already use" },
    { feature: "Embedded Google Maps + hours", reason: "Reduces \"are you open?\" calls" },
    { feature: "Instagram feed integration", reason: "Food businesses live on social proof" },
  ],
  cafe: [
    { feature: "Menu with prices", reason: "Speeds up decision-making" },
    { feature: "WhatsApp / call ordering", reason: "Low-friction ordering for regulars" },
    { feature: "Google Maps + opening hours", reason: "Local foot traffic needs quick answers" },
    { feature: "Instagram feed", reason: "Visual businesses convert via social proof" },
  ],
  bakery: [
    { feature: "Product gallery with prices", reason: "Custom orders need visual reference" },
    { feature: "Order-ahead / custom cake request form", reason: "Captures high-value custom orders" },
    { feature: "WhatsApp ordering button", reason: "Fast, familiar ordering channel" },
  ],
  dentist: [
    { feature: "Online appointment booking", reason: "Removes the biggest friction point for new patients" },
    { feature: "Treatments & pricing overview", reason: "Reduces anxiety and phone-only enquiries" },
    { feature: "Medical aid / insurance info", reason: "A top question before booking in South Africa" },
    { feature: "Patient testimonials", reason: "Trust matters more for medical decisions" },
    { feature: "Clear contact + emergency info", reason: "Dental pain drives urgent searches" },
  ],
  doctor: [
    { feature: "Online appointment booking", reason: "Reduces phone queue at reception" },
    { feature: "Services / specialties list", reason: "Helps patients self-select the right visit" },
    { feature: "Medical aid information", reason: "A top pre-booking question" },
  ],
  physiotherapist: [
    { feature: "Online booking", reason: "Convenience drives conversion for recurring appointments" },
    { feature: "Treatment specialties", reason: "Patients search by condition, not brand" },
    { feature: "Medical aid info", reason: "Removes a common booking blocker" },
  ],
  veterinary: [
    { feature: "Emergency contact banner", reason: "Pet emergencies drive urgent, high-intent searches" },
    { feature: "Online booking / request form", reason: "Convenience for routine check-ups" },
    { feature: "Services & pricing overview", reason: "Reduces price-shopping phone calls" },
  ],
  plumber: [
    { feature: "Emergency call-now button", reason: "Plumbing leads are often urgent, same-day decisions" },
    { feature: "WhatsApp quote request", reason: "Lets customers send photos of the problem" },
    { feature: "Service areas map", reason: "Confirms coverage before they call" },
    { feature: "Reviews section", reason: "Trust is critical for in-home services" },
    { feature: "Request-a-quote form", reason: "Captures leads outside business hours" },
  ],
  electrician: [
    { feature: "Emergency call-now button", reason: "Electrical issues are often urgent" },
    { feature: "WhatsApp quote request", reason: "Photo-based quoting speeds up the sale" },
    { feature: "Service areas + certifications", reason: "Builds trust for safety-critical work" },
    { feature: "Reviews section", reason: "Reduces risk perception for in-home work" },
  ],
  car_repair: [
    { feature: "Book-a-service form", reason: "Converts routine maintenance bookings online" },
    { feature: "Service & pricing list", reason: "Reduces price-comparison phone calls" },
    { feature: "WhatsApp quote request", reason: "Fast way to send car details/photos" },
  ],
  gym: [
    { feature: "Membership plans & pricing", reason: "Removes the top pre-signup question" },
    { feature: "Class timetable", reason: "The #1 reason members check a gym site" },
    { feature: "Trainer profiles", reason: "Personal connection drives signups" },
    { feature: "Free trial signup form", reason: "Low-friction way to convert visitors" },
  ],
  hair_salon: [
    { feature: "Online booking", reason: "Salons lose walk-in-only customers to booking-enabled competitors" },
    { feature: "Service menu with pricing", reason: "Reduces \"how much for...\" calls" },
    { feature: "Instagram gallery", reason: "Hair/beauty is a highly visual, portfolio-driven decision" },
  ],
  beauty_salon: [
    { feature: "Online booking", reason: "Convenience drives repeat bookings" },
    { feature: "Service menu with pricing", reason: "Sets expectations before the call" },
    { feature: "Instagram gallery", reason: "Visual proof of work quality" },
  ],
  real_estate: [
    { feature: "Property listings with search/filter", reason: "Core expectation for any agency site" },
    { feature: "Lead capture / valuation request form", reason: "Converts browsers into contactable leads" },
    { feature: "Agent profiles", reason: "Buyers/sellers choose people, not just agencies" },
  ],
  lawyer: [
    { feature: "Practice areas overview", reason: "Helps visitors self-qualify before contacting" },
    { feature: "Consultation request form", reason: "Lower-commitment first step than calling" },
    { feature: "Credentials & case results", reason: "Trust signals matter heavily for legal services" },
  ],
  accountant: [
    { feature: "Services overview (tax, payroll, etc.)", reason: "Clarifies fit before a call" },
    { feature: "Secure document upload / contact form", reason: "Convenience for ongoing clients" },
    { feature: "Client testimonials", reason: "Trust drives referral-based industries" },
  ],
  guest_house: [
    { feature: "Room gallery with rates", reason: "Guests compare visually before booking" },
    { feature: "Availability / booking form", reason: "Direct bookings avoid OTA commission" },
    { feature: "Map + nearby attractions", reason: "Helps guests plan their stay" },
  ],
};

const DEFAULT_RECOMMENDATIONS: FeatureRecommendation[] = [
  { feature: "Clear services overview", reason: "Visitors decide within seconds whether you offer what they need" },
  { feature: "WhatsApp contact button", reason: "The lowest-friction way South African customers reach a business" },
  { feature: "Request-a-quote / contact form", reason: "Captures leads outside of business hours" },
  { feature: "Embedded Google Maps", reason: "Confirms location and builds trust instantly" },
  { feature: "Customer reviews section", reason: "Social proof shortens the decision process" },
];

export function recommendFeatures(categoryId: string): FeatureRecommendation[] {
  const normalized = categoryId.toLowerCase().replace(/\s+/g, "_");
  return RECOMMENDATIONS[normalized] ?? DEFAULT_RECOMMENDATIONS;
}
