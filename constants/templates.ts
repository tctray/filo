// constants/templates.ts
import type { CoverLetter, Resume, ResumeSectionType } from "@/types";

const generateId = () => Math.random().toString(36).substring(2, 15);

const baseSectionOrder: ResumeSectionType[] = [
  "summary",
  "experience",
  "skills",
  "education",
  "projects",
  "certifications",
];

/**
 * Templates are NOT saved records yet, so they shouldn't have Resume/CoverLetter `id`.
 * We add `templateId` just for UI keys + selection.
 */
export type ResumeTemplate = Omit<Resume, "id" | "createdAt" | "updatedAt"> & {
  templateId: string;
};

export type CoverLetterTemplate = Omit<
  CoverLetter,
  "id" | "createdAt" | "updatedAt"
> & {
  templateId: string;
};

export const resumeTemplates: ResumeTemplate[] = [
  {
    templateId: "resume_software_engineer",
    title: "Software Engineer Resume",
    isDraft: false,
    header: {
      name: "Alex Johnson",
      email: "alex@example.com",
      phone: "(555) 123-4567",
      location: "San Francisco, CA",
      links: ["linkedin.com/in/alexj", "github.com/alexj"],
    },
    summary:
      "Results-driven software engineer with 5+ years of experience building scalable web applications. Proficient in React, Node.js, and cloud services. Passionate about clean code and delivering exceptional user experiences.",
    skills: [
      "React",
      "TypeScript",
      "Node.js",
      "Python",
      "AWS",
      "PostgreSQL",
      "GraphQL",
      "Docker",
    ],
    experience: [
      {
        id: generateId(),
        company: "Tech Corp",
        title: "Senior Software Engineer",
        startDate: "2021-03",
        endDate: "Present",
        bullets: [
          "Led development of customer-facing dashboard serving 100K+ daily users",
          "Reduced API response times by 40% through query optimization",
          "Mentored 3 junior engineers and established code review practices",
        ],
      },
      {
        id: generateId(),
        company: "StartupXYZ",
        title: "Software Engineer",
        startDate: "2019-01",
        endDate: "2021-02",
        bullets: [
          "Built real-time collaboration features using WebSockets",
          "Designed and implemented RESTful APIs serving 50K requests/day",
        ],
      },
    ],
    education: [
      {
        id: generateId(),
        institution: "University of California, Berkeley",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2015",
        endDate: "2019",
      },
    ],
    certifications: [
      {
        id: generateId(),
        name: "AWS Solutions Architect",
        issuer: "Amazon",
        date: "2022",
      },
    ],
    projects: [
      {
        id: generateId(),
        name: "OpenTracker",
        description:
          "Open-source project management tool with 2K+ GitHub stars",
        technologies: ["React", "Node.js", "MongoDB"],
        link: "github.com/alexj/opentracker",
      },
    ],
    sectionOrder: baseSectionOrder,
  },

  {
    templateId: "resume_marketing_manager",
    title: "Marketing Manager Resume",
    isDraft: false,
    header: {
      name: "Jordan Rivera",
      email: "jordan@example.com",
      phone: "(555) 987-6543",
      location: "New York, NY",
      links: ["linkedin.com/in/jordanr"],
    },
    summary:
      "Creative marketing professional with 7 years of experience driving brand growth through data-driven campaigns. Expert in digital marketing, content strategy, and team leadership.",
    skills: [
      "Digital Marketing",
      "SEO/SEM",
      "Content Strategy",
      "Google Analytics",
      "HubSpot",
      "Social Media",
      "A/B Testing",
      "Brand Management",
    ],
    experience: [
      {
        id: generateId(),
        company: "Brand Co",
        title: "Marketing Manager",
        startDate: "2020-06",
        endDate: "Present",
        bullets: [
          "Grew organic traffic by 150% year-over-year through SEO initiatives",
          "Managed $500K annual advertising budget across multiple channels",
          "Led team of 5 marketing specialists and 3 content creators",
        ],
      },
    ],
    education: [
      {
        id: generateId(),
        institution: "NYU Stern School of Business",
        degree: "MBA",
        field: "Marketing",
        startDate: "2016",
        endDate: "2018",
      },
    ],
    certifications: [
      {
        id: generateId(),
        name: "Google Analytics Certified",
        issuer: "Google",
        date: "2023",
      },
    ],
    projects: [],
    sectionOrder: [
      "summary",
      "experience",
      "skills",
      "education",
      "certifications",
    ],
  },

  {
    templateId: "resume_minimal_clean",
    title: "Minimal Clean Resume",
    isDraft: false,
    header: {
      name: "Your Name",
      email: "you@email.com",
      phone: "",
      location: "",
      links: [],
    },
    summary: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    sectionOrder: ["summary", "experience", "skills", "education"],
  },
];

export const coverLetterTemplates: CoverLetterTemplate[] = [
  {
    templateId: "cl_professional",
    title: "Professional Cover Letter",
    jobTitle: "Software Engineer",
    company: "Acme Corp",
    hiringManager: "Hiring Manager",
    tone: "formal",
    body: `Dear Hiring Manager,

I am writing to express my strong interest in the Software Engineer position at Acme Corp. With my background in full-stack development and a passion for building user-centric products, I am confident in my ability to contribute meaningfully to your team.

In my current role, I have led the development of scalable applications serving thousands of users daily. My experience with modern technologies and agile methodologies aligns well with the requirements outlined in your job posting.

I am particularly drawn to Acme Corp's commitment to innovation and would welcome the opportunity to discuss how my skills and experience can support your team's goals.

Thank you for your consideration. I look forward to hearing from you.

Sincerely,
[Your Name]`,
  },

  {
    templateId: "cl_confident",
    title: "Confident Career Changer",
    jobTitle: "Product Manager",
    company: "Innovation Labs",
    hiringManager: "",
    tone: "confident",
    body: `Hi there,

I'm reaching out about the Product Manager role at Innovation Labs — and I'm genuinely excited about it. My career path might look unconventional, but that's exactly what makes me a strong candidate.

I bring a unique blend of technical expertise and business acumen that few candidates can match. Having spent years in engineering, I understand what it takes to ship great products from both sides of the table.

I've driven products from concept to launch, collaborated across disciplines, and consistently delivered results that moved the needle. I'm ready to bring that same energy to your team.

Let's talk about how I can make an impact at Innovation Labs.

Best,
[Your Name]`,
  },

  {
    templateId: "cl_bold",
    title: "Bold Startup Application",
    jobTitle: "Growth Lead",
    company: "RocketStart",
    hiringManager: "",
    tone: "bold",
    body: `Hey RocketStart team,

I'll cut to the chase: I want to help you grow, and I've got the track record to back it up.

In my last role, I took a product from 1K to 50K users in 8 months using a mix of creative marketing, data analysis, and scrappy execution. I thrive in fast-paced environments where I can wear multiple hats and drive real results.

I've been following RocketStart's journey and I love what you're building. Your product has massive potential, and with the right growth strategy, the sky's the limit.

I'd love to chat about how we can make that happen together.

Cheers,
[Your Name]`,
  },
];
