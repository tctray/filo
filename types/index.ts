// types/index.ts

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected";

export type JobStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export type JobAttachment = {
  type: "pdf" | "image";
  uri: string;
  name?: string;
};

export type JobNotificationIds = {
  followUp?: string;
  interview?: string;
  deadline?: string;
};

export type Job = {
  id: string;
  company: string;
  roleTitle: string;
  location?: string;
  status: JobStatus;
  jobUrl?: string;
  jobDescription?: string;
  attachments?: JobAttachment[];
  dateSaved?: string;
  dateApplied?: string;
  followUpDate?: string;
  interviewDate?: string;
  deadline?: string;
  notes?: string;
  resumeId?: string;
  coverLetterId?: string;
  notificationIds?: JobNotificationIds;
  createdAt: string;
  updatedAt: string;
};

export type CoverLetterTone = "formal" | "confident" | "bold";

export type UploadedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

export type ResumeSectionType =
  | "summary"
  | "experience"
  | "skills"
  | "education"
  | "projects"
  | "certifications";

export type Resume = {
  id: string;
  title: string;
  isDraft?: boolean;
  header?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    links?: string[];
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    id: string;
    company: string;
    title: string;
    startDate?: string;
    endDate?: string;
    bullets: string[];
  }>;
  education?: Array<{
    id: string;
    institution: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issuer?: string;
    date?: string;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    description?: string;
    technologies?: string[];
    link?: string;
  }>;
  sectionOrder?: ResumeSectionType[];
  folder?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
};

export type CoverLetter = {
  id: string;
  title: string;
  jobTitle?: string;
  company?: string;
  hiringManager: string;
  tone?: CoverLetterTone;
  body: string;
  uploadedFile?: UploadedFile;
  folder?: string;
  createdAt: string;
  updatedAt: string;
};

export type Application = {
  id: string;
  company: string;
  roleTitle: string;
  location?: string;
  status: ApplicationStatus;
  // Job details
  jobUrl?: string;
  jobDescription?: string;
  salaryMin?: string;
  salaryMax?: string;
  salaryType?: "hourly" | "annual";
  workType?: "remote" | "hybrid" | "onsite";
  companySize?: string;
  hiringManager?: string;
  referral?: string;
  // Dates
  dateApplied?: string;
  followUpDate?: string;
  interviewDate?: string;
  deadline?: string;
  notes?: string;
  resumeId?: string;
  coverLetterId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Folder = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};
