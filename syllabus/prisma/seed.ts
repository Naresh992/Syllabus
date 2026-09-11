/* eslint-disable no-console */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---- helpers ---------------------------------------------------------------
const photos = (slug: string, name: string, n: number) =>
  JSON.stringify(
    Array.from({ length: n }, (_, i) => `/api/avatar/${slug}-${i + 1}?label=${encodeURIComponent(name)}`)
  );

const P = (q: string, a: string) => ({ q, a });
const prompts = (arr: { q: string; a: string }[]) => JSON.stringify(arr);
const dob = (s: string) => new Date(`${s}T00:00:00.000Z`);

type Student = {
  slug: string;
  name: string;
  email: string;
  campus: "verrill" | "lakeside" | "northwood";
  dob: string;
  major: string;
  classYear: string;
  intent: string;
  hookupOptIn?: boolean;
  bio: string;
  prompts: { q: string; a: string }[];
  photoCount: number;
};

const STUDENTS: Student[] = [
  // ---------------- Verrill University (verrill.edu) ----------------
  {
    slug: "alex-rivera",
    name: "Alex Rivera",
    email: "alex@verrill.edu",
    campus: "verrill",
    dob: "2003-05-14",
    major: "Computer Science",
    classYear: "Junior",
    intent: "Serious Relationship",
    bio: "Building side projects at 2am and pretending I'll sleep early tomorrow. Will trade code reviews for coffee.",
    prompts: [
      P("Most unhinged thing I've done on campus is…", "Submitted a final 4 seconds before the deadline from the dining hall floor."),
      P("My ideal study date is…", "Two laptops, one playlist, and a shared basket of fries."),
      P("I'll add you to my syllabus if…", "you can explain your major without using buzzwords."),
    ],
    photoCount: 3,
  },
  {
    slug: "priya-nair",
    name: "Priya Nair",
    email: "priya@verrill.edu",
    campus: "verrill",
    dob: "2002-11-02",
    major: "Neuroscience",
    classYear: "Senior",
    intent: "Casual Dating",
    bio: "Neuro major who will absolutely explain your dreams unprompted. Espresso enthusiast, terrible at chess.",
    prompts: [
      P("You'll find me in the library when…", "it's raining and the third-floor window seats are open."),
      P("The class that changed me was…", "Intro to Cognitive Science — I haven't shut up about it since."),
      P("Hype me up before finals by…", "sending me a voice note of you yelling 'you're brilliant.'"),
    ],
    photoCount: 4,
  },
  {
    slug: "marcus-bell",
    name: "Marcus Bell",
    email: "marcus@verrill.edu",
    campus: "verrill",
    dob: "2004-01-20",
    major: "Business",
    classYear: "Sophomore",
    intent: "Study Buddy First",
    bio: "Intramural soccer, spreadsheets for fun, and a deeply held belief that breakfast burritos fix everything.",
    prompts: [
      P("My ideal study date is…", "flashcards over tacos, loser buys dessert."),
      P("Two truths and a lie about my major…", "I've pitched to a real VC, I hate PowerPoint, I've never used Excel."),
      P("I'll add you to my syllabus if…", "you're competitive about trivia night."),
    ],
    photoCount: 3,
  },
  {
    slug: "jade-wong",
    name: "Jade Wong",
    email: "jade@verrill.edu",
    campus: "verrill",
    dob: "2003-07-30",
    major: "Fine Arts",
    classYear: "Junior",
    intent: "New Friends",
    bio: "Painting murals, collecting enamel pins, and always down for a spontaneous museum trip.",
    prompts: [
      P("Most unhinged thing I've done on campus is…", "repainted my dorm door as a Rothko. RA was not thrilled."),
      P("You'll find me in the library when…", "I'm hiding from my critique deadline."),
      P("Hype me up before finals by…", "bringing me stickers and iced matcha."),
    ],
    photoCount: 4,
  },
  {
    slug: "diego-santos",
    name: "Diego Santos",
    email: "diego@verrill.edu",
    campus: "verrill",
    dob: "2002-09-09",
    major: "Mechanical Engineering",
    classYear: "Senior",
    intent: "Open to Anything",
    bio: "Formula SAE team, rock climbing, and an unreasonable number of half-finished 3D prints.",
    prompts: [
      P("The class that changed me was…", "Thermodynamics — humbling in every possible way."),
      P("My ideal study date is…", "the climbing gym, then problem sets on the mats."),
      P("I'll add you to my syllabus if…", "you let me over-engineer a solution to a tiny problem."),
    ],
    photoCount: 3,
  },
  {
    slug: "hannah-kim",
    name: "Hannah Kim",
    email: "hannah@verrill.edu",
    campus: "verrill",
    dob: "2004-03-18",
    major: "Psychology",
    classYear: "Sophomore",
    intent: "Serious Relationship",
    bio: "Psych major, plant hoarder, and the friend who remembers everyone's coffee order.",
    prompts: [
      P("You'll find me in the library when…", "I've bribed myself with a pastry from the corner café."),
      P("My most controversial campus opinion is…", "the quiet floor should be enforced by law."),
      P("I'll add you to my syllabus if…", "you text back in full sentences."),
    ],
    photoCount: 4,
  },
  {
    slug: "tyler-brooks",
    name: "Tyler Brooks",
    email: "tyler@verrill.edu",
    campus: "verrill",
    dob: "2003-12-05",
    major: "Economics",
    classYear: "Junior",
    intent: "Situationship",
    bio: "Runs the campus radio graveyard shift. Will make you a playlist before I learn your last name.",
    prompts: [
      P("Most unhinged thing I've done on campus is…", "hosted a 3am on-air debate about whether cereal is soup."),
      P("Hype me up before finals by…", "requesting a song and pretending you called in."),
      P("Two truths and a lie about my major…", "I forecast the March Madness bracket with a model, badly."),
    ],
    photoCount: 3,
  },

  // ---------------- Lakeside College (lakeside.edu) ----------------
  {
    slug: "sofia-rossi",
    name: "Sofia Rossi",
    email: "sofia@lakeside.edu",
    campus: "lakeside",
    dob: "2002-06-21",
    major: "English Literature",
    classYear: "Senior",
    intent: "Casual Dating",
    bio: "Annotating novels in the margins like it's a competitive sport. Red pen forever.",
    prompts: [
      P("The class that changed me was…", "Victorian Lit — I now cry at very long sentences."),
      P("My ideal study date is…", "a used bookstore crawl, then espresso and hot takes."),
      P("I'll add you to my syllabus if…", "you have a strong opinion about the Oxford comma."),
    ],
    photoCount: 4,
  },
  {
    slug: "noah-adeyemi",
    name: "Noah Adeyemi",
    email: "noah@lakeside.edu",
    campus: "lakeside",
    dob: "2003-02-27",
    major: "Film & Media",
    classYear: "Junior",
    intent: "Open to Anything",
    bio: "Shooting a short film that's perpetually 'almost done.' Will cast you as the mysterious stranger.",
    prompts: [
      P("Most unhinged thing I've done on campus is…", "filmed a sunrise timelapse from the roof (don't tell facilities)."),
      P("You'll find me in the library when…", "I'm 'researching' but really watching Criterion."),
      P("Hype me up before finals by…", "narrating my life in a movie-trailer voice."),
    ],
    photoCount: 3,
  },
  {
    slug: "mia-chen",
    name: "Mia Chen",
    email: "mia@lakeside.edu",
    campus: "lakeside",
    dob: "2004-04-11",
    major: "Nursing",
    classYear: "Sophomore",
    intent: "New Friends",
    bio: "Clinical rotations by day, bad reality TV by night. I will absolutely take your blood pressure for fun.",
    prompts: [
      P("My ideal study date is…", "quizzing each other with flashcards and snacks."),
      P("Hype me up before finals by…", "reminding me I've survived worse call shifts."),
      P("I'll add you to my syllabus if…", "you're calm in a crisis and love a good diner."),
    ],
    photoCount: 4,
  },
  {
    slug: "liam-oconnor",
    name: "Liam O'Connor",
    email: "liam@lakeside.edu",
    campus: "lakeside",
    dob: "2002-10-16",
    major: "Philosophy",
    classYear: "Senior",
    intent: "Situationship",
    bio: "Will ask 'but what do we mean by that?' at least once per date. Tea over coffee, always.",
    prompts: [
      P("My most controversial campus opinion is…", "8am classes build character. I stand by it."),
      P("The class that changed me was…", "Ethics — now I overthink the trolley problem at crosswalks."),
      P("I'll add you to my syllabus if…", "you argue with me and mean it kindly."),
    ],
    photoCount: 3,
  },

  // ---------------- Northwood State (northwood.edu) ----------------
  {
    slug: "zoe-park",
    name: "Zoe Park",
    email: "zoe@northwood.edu",
    campus: "northwood",
    dob: "2003-08-08",
    major: "Architecture",
    classYear: "Junior",
    intent: "Study Buddy First",
    bio: "Cardboard model enthusiast running on studio coffee and spite. I'll redesign your apartment unasked.",
    prompts: [
      P("You'll find me in the library when…", "the studio printer is jammed (again)."),
      P("Most unhinged thing I've done on campus is…", "pulled three all-nighters for a model I dropped down the stairs."),
      P("I'll add you to my syllabus if…", "you appreciate a good load-bearing pun."),
    ],
    photoCount: 4,
  },
  {
    slug: "ethan-ross",
    name: "Ethan Ross",
    email: "ethan@northwood.edu",
    campus: "northwood",
    dob: "2004-05-23",
    major: "Chemistry",
    classYear: "Sophomore",
    intent: "Open to Anything",
    bio: "Lab goggles tan lines and a dangerous enthusiasm for making things fizz. Safety third (kidding).",
    prompts: [
      P("The class that changed me was…", "Organic Chem — trauma bonded with my entire cohort."),
      P("My ideal study date is…", "a coffee experiment: we rank every café on campus."),
      P("Hype me up before finals by…", "calling me 'doctor' prematurely."),
    ],
    photoCount: 3,
  },
  {
    slug: "ava-martinez",
    name: "Ava Martinez",
    email: "ava@northwood.edu",
    campus: "northwood",
    dob: "2002-12-30",
    major: "Communications",
    classYear: "Senior",
    intent: "Hookup Culture",
    hookupOptIn: true,
    bio: "Runs three group chats and a podcast. Chaotic good energy, excellent restaurant recommendations.",
    prompts: [
      P("Most unhinged thing I've done on campus is…", "live-tweeted a lecture until the professor followed me back."),
      P("My most controversial campus opinion is…", "group projects can be fun if I'm in charge."),
      P("I'll add you to my syllabus if…", "you're up for spontaneous 11pm nachos."),
    ],
    photoCount: 4,
  },
];

// Pending users (for the admin verification dashboard)
const PENDING = [
  {
    slug: "jordan-pierce",
    name: "Jordan Pierce",
    email: "jordan@verrill.edu",
    campus: "verrill" as const,
    dob: "2004-02-14",
  },
  {
    slug: "kayla-nguyen",
    name: "Kayla Nguyen",
    email: "kayla@lakeside.edu",
    campus: "lakeside" as const,
    dob: "2003-06-06",
  },
];

async function main() {
  console.log("🧹 Clearing existing data…");
  await prisma.message.deleteMany();
  await prisma.match.deleteMany();
  await prisma.swipe.deleteMany();
  await prisma.eventRSVP.deleteMany();
  await prisma.event.deleteMany();
  await prisma.report.deleteMany();
  await prisma.block.deleteMany();
  await prisma.verificationDoc.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.campus.deleteMany();

  console.log("🏫 Creating campuses…");
  const verrill = await prisma.campus.create({
    data: { name: "Verrill University", domain: "verrill.edu", city: "Verrill, MA" },
  });
  const lakeside = await prisma.campus.create({
    data: { name: "Lakeside College", domain: "lakeside.edu", city: "Lakeside, MN" },
  });
  const northwood = await prisma.campus.create({
    data: { name: "Northwood State", domain: "northwood.edu", city: "Northwood, OR" },
  });
  const campusMap = { verrill, lakeside, northwood };

  const studentPw = await bcrypt.hash("password123", 10);
  const adminPw = await bcrypt.hash("admin123", 10);

  console.log("👤 Creating admin…");
  await prisma.user.create({
    data: {
      email: "admin@syllabus.app",
      passwordHash: adminPw,
      name: "Dean of Students",
      dob: dob("1988-01-01"),
      isAdmin: true,
      verificationStatus: "approved",
    },
  });

  console.log("🎓 Creating verified students + profiles…");
  const idBySlug: Record<string, string> = {};
  for (const s of STUDENTS) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash: studentPw,
        name: s.name,
        dob: dob(s.dob),
        campusId: campusMap[s.campus].id,
        verificationStatus: "approved",
        profile: {
          create: {
            bio: s.bio,
            major: s.major,
            classYear: s.classYear,
            intent: s.intent,
            hookupOptIn: s.hookupOptIn ?? false,
            photos: photos(s.slug, s.name, s.photoCount),
            prompts: prompts(s.prompts),
          },
        },
        verification: {
          create: {
            idPhotoUrl: `/api/avatar/${s.slug}-id?label=${encodeURIComponent(s.name + " ID")}`,
            selfieUrl: `/api/avatar/${s.slug}-selfie?label=${encodeURIComponent(s.name)}`,
            status: "approved",
            reviewedAt: new Date(),
            faceMatchScore: 0.9,
          },
        },
        subscription: {
          create: { tier: "audit", status: "active" },
        },
      },
    });
    idBySlug[s.slug] = user.id;
  }

  const demoId = idBySlug["alex-rivera"];

  console.log("📝 Creating pending verification users…");
  for (const p of PENDING) {
    await prisma.user.create({
      data: {
        email: p.email,
        passwordHash: studentPw,
        name: p.name,
        dob: dob(p.dob),
        campusId: campusMap[p.campus].id,
        verificationStatus: "pending",
        verification: {
          create: {
            idPhotoUrl: `/api/avatar/${p.slug}-id?label=${encodeURIComponent(p.name + " ID")}`,
            selfieUrl: `/api/avatar/${p.slug}-selfie?label=${encodeURIComponent(p.name)}`,
            status: "pending",
            faceMatchScore: 0.82,
          },
        },
      },
    });
  }

  // ---- Incoming likes on the demo user (populate "Class Roster") ----
  console.log("💌 Seeding incoming likes on demo user…");
  const likers: { slug: string; dir: string }[] = [
    { slug: "marcus-bell", dir: "add" },
    { slug: "hannah-kim", dir: "raise_hand" },
    { slug: "tyler-brooks", dir: "add" },
    { slug: "diego-santos", dir: "add" },
    { slug: "noah-adeyemi", dir: "add" }, // cross-campus
    { slug: "zoe-park", dir: "add" }, // cross-campus
  ];
  for (const l of likers) {
    await prisma.swipe.create({
      data: { swiperId: idBySlug[l.slug], swipedId: demoId, direction: l.dir },
    });
  }

  // ---- Two existing mutual matches with conversations ----
  console.log("💞 Seeding matches + Office Hours conversations…");
  async function makeMatch(slug: string, msgs: { from: "me" | "them"; text: string; minsAgo: number }[]) {
    const otherId = idBySlug[slug];
    // reciprocal swipes
    await prisma.swipe.create({ data: { swiperId: otherId, swipedId: demoId, direction: "add" } });
    await prisma.swipe.create({ data: { swiperId: demoId, swipedId: otherId, direction: "add" } });
    const match = await prisma.match.create({
      data: { userAId: demoId, userBId: otherId },
    });
    for (const m of msgs) {
      await prisma.message.create({
        data: {
          matchId: match.id,
          senderId: m.from === "me" ? demoId : otherId,
          content: m.text,
          sentAt: new Date(Date.now() - m.minsAgo * 60 * 1000),
        },
      });
    }
  }

  await makeMatch("priya-nair", [
    { from: "them", text: "okay your prompt about submitting a final from the dining hall floor sent me 😭", minsAgo: 220 },
    { from: "me", text: "it was a formative experience. character building.", minsAgo: 215 },
    { from: "them", text: "respect. coffee this week? I'll explain your dreams for free", minsAgo: 120 },
    { from: "me", text: "sold. thursday between classes?", minsAgo: 60 },
  ]);

  await makeMatch("jade-wong", [
    { from: "them", text: "a museum trip person AND you code? adding you to the syllabus immediately", minsAgo: 300 },
    { from: "me", text: "haha I bring snacks to museums, it's a whole thing", minsAgo: 280 },
    { from: "them", text: "that's the green flag of all time", minsAgo: 90 },
  ]);

  // ---- Study Group events ----
  console.log("📅 Creating Study Group events…");
  const soon = (days: number, hour = 19) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const eVerrill = await prisma.event.create({
    data: {
      campusId: verrill.id,
      title: "Verrill Fall Mixer @ The Quad",
      description:
        "Fairy lights, a live student band, and hot cider. Verified Verrill students only — come find your study buddy IRL.",
      date: soon(5),
      location: "The Quad Lawn, Verrill University",
    },
  });
  const eLakeside = await prisma.event.create({
    data: {
      campusId: lakeside.id,
      title: "Lakeside Trivia Night",
      description:
        "Six rounds, ridiculous prizes, and forced-fun icebreakers. Teams of 4 — show up solo and we'll match you.",
      date: soon(9),
      location: "Harbor Hall Commons, Lakeside College",
    },
  });
  await prisma.event.create({
    data: {
      campusId: northwood.id,
      title: "Northwood Rooftop Study & Chill",
      description:
        "Golden-hour study session that turns into a hangout. Bring your flashcards, leave with new friends.",
      date: soon(12),
      location: "Beckett Library Rooftop, Northwood State",
    },
  });

  // A few RSVPs so events feel alive
  await prisma.eventRSVP.create({ data: { eventId: eVerrill.id, userId: idBySlug["priya-nair"] } });
  await prisma.eventRSVP.create({ data: { eventId: eVerrill.id, userId: idBySlug["marcus-bell"] } });
  await prisma.eventRSVP.create({ data: { eventId: eLakeside.id, userId: idBySlug["sofia-rossi"] } });

  console.log("\n✅ Seed complete!");
  console.log("   Demo student:  alex@verrill.edu / password123  (free 'Audit' tier)");
  console.log("   Admin:         admin@syllabus.app / admin123");
  console.log("   All students share the password: password123\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
