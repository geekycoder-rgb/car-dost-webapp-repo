export const REVIEW_CATEGORIES = [
  { slug: "all", label: "All Reviews" },
  { slug: "key-chains", label: "Key Chains" },
  { slug: "body-covers", label: "Body Covers" },
  { slug: "speakers", label: "Speakers" },
  { slug: "amplifiers", label: "Amplifiers" },
];

export const REVIEWS = [
  // Key Chains
  { id: "r1", name: "Arjun Mehta", location: "Mumbai, MH", rating: 5, category: "key-chains", productName: "Premium Leather Key Cover · Hyundai i20", review: "Stunning quality! The leather is super soft and feels premium in hand. Stitching is flawless. Got compliments from everyone who saw my keys.", date: "2 weeks ago", verified: true, initials: "AM", color: "bg-indigo-500" },
  { id: "r2", name: "Priya Sharma", location: "Bengaluru, KA", rating: 5, category: "key-chains", productName: "Metal Premium Key Cover · Maruti Swift", review: "Bought this metal key cover for my new Swift. Quality is way better than expected — looks like an OEM accessory. Delivery was super fast.", date: "1 month ago", verified: true, initials: "PS", color: "bg-pink-500" },
  { id: "r3", name: "Rohit Singh", location: "Delhi NCR", rating: 5, category: "key-chains", productName: "Carbon Fibre Key Case · Honda City", review: "Honestly the best key cover I've ever owned. Carbon fibre finish is identical to the showroom pictures. Worth every rupee.", date: "3 weeks ago", verified: true, initials: "RS", color: "bg-emerald-500" },
  { id: "r4", name: "Sneha Iyer", location: "Chennai, TN", rating: 5, category: "key-chains", productName: "Silicone TPU Cover · Toyota Innova", review: "Perfect fit on Innova Crysta keys. Buttons work smoothly through the silicone. Great grip, doesn't slip out of hand.", date: "5 days ago", verified: true, initials: "SI", color: "bg-amber-500" },

  // Body Covers
  { id: "r5", name: "Vikram Reddy", location: "Hyderabad, TS", rating: 5, category: "body-covers", productName: "Premium Waterproof Body Cover · Hyundai Creta", review: "Survived two monsoon storms without a single drop reaching the paint. Double-stitched seams are top-notch. Highly recommended.", date: "1 month ago", verified: true, initials: "VR", color: "bg-indigo-600" },
  { id: "r6", name: "Anita Kapoor", location: "Pune, MH", rating: 5, category: "body-covers", productName: "Custom-Fit Cover · Kia Seltos", review: "Fits my Seltos like a glove. The elastic at the bottom keeps it tight even in windy weather. Material is breathable too.", date: "2 weeks ago", verified: true, initials: "AK", color: "bg-rose-500" },
  { id: "r7", name: "Karthik Nair", location: "Kochi, KL", rating: 5, category: "body-covers", productName: "All-Weather Body Cover · Mahindra Thar", review: "Brilliant cover for my Thar. The triple-layer fabric protects from sun, dust and rain. Got it custom-fitted with mirror pockets — exactly as described.", date: "3 days ago", verified: true, initials: "KN", color: "bg-cyan-500" },
  { id: "r8", name: "Meera Joshi", location: "Ahmedabad, GJ", rating: 5, category: "body-covers", productName: "Heavy Duty Cover · Maruti Baleno", review: "Excellent build quality. Lightweight and easy to put on/remove. Comes with a carry bag which is super convenient.", date: "1 week ago", verified: true, initials: "MJ", color: "bg-purple-500" },

  // Speakers
  { id: "r9", name: "Aditya Verma", location: "Jaipur, RJ", rating: 5, category: "speakers", productName: "Sony XS-FB1620E 6.5\" Coaxial", review: "Mind-blowing clarity and bass for the price! Replaced my factory speakers with these — the difference is night and day. Sony quality at its finest.", date: "1 month ago", verified: true, initials: "AV", color: "bg-blue-500" },
  { id: "r10", name: "Divya Krishnan", location: "Bengaluru, KA", rating: 5, category: "speakers", productName: "Pioneer TS-A6976S 6x9\" 3-Way", review: "These Pioneer 6x9s are absolute beasts. Installed them in my Verna rear deck and the soundstage is incredible. Highs are crisp, bass is punchy.", date: "2 weeks ago", verified: true, initials: "DK", color: "bg-fuchsia-500" },
  { id: "r11", name: "Sanjay Patel", location: "Surat, GJ", rating: 5, category: "speakers", productName: "JBL Stage1621 6.5\" Coaxial", review: "JBL Stage1621 sounds phenomenal. Loud, clear and zero distortion even at max volume. Worth every penny — true to JBL legacy.", date: "5 days ago", verified: true, initials: "SP", color: "bg-orange-500" },
  { id: "r12", name: "Neha Bhatia", location: "Chandigarh, CH", rating: 5, category: "speakers", productName: "Sony XS-FB693E 6x9\" Mega Bass", review: "Got these installed by CarDost's team — service was impeccable. The mega bass is no joke; I can feel every drum hit. Absolutely love them.", date: "3 weeks ago", verified: true, initials: "NB", color: "bg-teal-500" },

  // Amplifiers
  { id: "r13", name: "Rahul Khanna", location: "Lucknow, UP", rating: 5, category: "amplifiers", productName: "Xxygen ONAE 2727 3500W Mono Amp", review: "This mono amp is a monster! Powering a 12\" subwoofer and the bass response is room-shaking. Build quality is solid — no overheating issues even after long drives.", date: "2 weeks ago", verified: true, initials: "RK", color: "bg-violet-500" },
  { id: "r14", name: "Anushka Rao", location: "Pune, MH", rating: 5, category: "amplifiers", productName: "Magnetz MGT-A160 4-Channel Amp", review: "Powering four 6.5\" speakers and the result is breathtaking. Crystal clear at every volume level. The built-in crossover is a lifesaver for tuning.", date: "1 month ago", verified: true, initials: "AR", color: "bg-pink-600" },
  { id: "r15", name: "Manoj Tiwari", location: "Bhopal, MP", rating: 5, category: "amplifiers", productName: "Sony XM-N1004 4-Channel", review: "Sony amp + Pioneer 6x9s = audio heaven. The amp drives the speakers effortlessly. Quality far exceeds the price tag.", date: "3 weeks ago", verified: true, initials: "MT", color: "bg-emerald-600" },
  { id: "r16", name: "Pooja Desai", location: "Mumbai, MH", rating: 5, category: "amplifiers", productName: "DS18 G-1500.1D Mono Block", review: "Got this for my custom sub enclosure. The 1500W RMS drives my 10\" sub like it's nothing. Heat dissipation is excellent. Highly recommend!", date: "4 days ago", verified: true, initials: "PD", color: "bg-amber-600" },
];

export const REVIEW_STATS = {
  total: 4287,
  average: 4.8,
  distribution: { 5: 87, 4: 9, 3: 3, 2: 1, 1: 0 }, // percentages
};
