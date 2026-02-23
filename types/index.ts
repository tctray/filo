export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface ResumeHeader {
  name: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link: string;
}

export type ResumeSectionType =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "certifications"
  | "projects";

export interface UploadedFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
}

export interface Resume {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
  header: ResumeHeader;
  summary: string;
  skills: string[];
  experience: ExperienceItem[];
  education: EducationItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  sectionOrder: ResumeSectionType[];
  folder?: string;
  tags?: string[];
  uploadedFile?: UploadedFile;
}

export type CoverLetterTone = "formal" | "confident" | "bold";

export interface CoverLetter {
  id: string;
  title: string;
  jobTitle: string;
  company: string;
  hiringManager: string;
  tone: CoverLetterTone;
  body: string;
  createdAt: string;
  updatedAt: string;
  folder?: string;
  tags?: string[];
  uploadedFile?: UploadedFile;
}

export type ApplicationStatus =
  | "Saved"
  | "Applied"
  | "Interview"
  | "Offer"
  | "Rejected";

export interface Application {
  id: string;
  company: string;
  roleTitle: string;
  location: string;
  status: ApplicationStatus;
  dateApplied: string;
  notes: string;
  followUpDate: string;
  resumeId: string;
  coverLetterId: string;
  createdAt: string;
  updatedAt: string;
  folder?: string;
  tags?: string[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}
