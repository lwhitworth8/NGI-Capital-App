/**
 * Comprehensive UC System Majors Database
 * Compiled from all UC campuses: Berkeley, UCLA, UCSD, UCI, UCSB, UCD, UCSC, UCR, UCM
 * Similar majors are combined to most common name
 */

export const UC_MAJORS = [
  // Business & Economics
  'Business Administration',
  'Economics',
  'Managerial Economics',
  'Business Economics',
  'Accounting',
  'Finance',
  'Marketing',
  'Management',
  'Entrepreneurship',
  'Supply Chain Management',
  'Business Analytics',
  
  // Engineering - Computer Science & Electrical
  'Computer Science',
  'Computer Engineering',
  'Electrical Engineering',
  'Electrical Engineering & Computer Sciences',
  'Software Engineering',
  'Data Science',
  'Computer Science & Engineering',
  'Information Systems',
  
  // Engineering - Other
  'Bioengineering',
  'Biomedical Engineering',
  'Mechanical Engineering',
  'Aerospace Engineering',
  'Civil Engineering',
  'Environmental Engineering',
  'Chemical Engineering',
  'Materials Science & Engineering',
  'Industrial Engineering',
  'Nuclear Engineering',
  'Ocean Engineering',
  'Structural Engineering',
  
  // Physical Sciences & Mathematics
  'Mathematics',
  'Applied Mathematics',
  'Statistics',
  'Physics',
  'Applied Physics',
  'Astrophysics',
  'Chemistry',
  'Biochemistry',
  'Earth Sciences',
  'Atmospheric Sciences',
  'Geology',
  'Geophysics',
  
  // Biological Sciences
  'Biology',
  'Molecular Biology',
  'Cell Biology',
  'Molecular & Cell Biology',
  'Genetics',
  'Neuroscience',
  'Microbiology',
  'Ecology',
  'Marine Biology',
  'Physiology',
  'Pharmacology',
  'Public Health',
  'Bioinformatics',
  
  // Social Sciences
  'Psychology',
  'Sociology',
  'Anthropology',
  'Political Science',
  'International Relations',
  'Geography',
  'Urban Studies',
  'Criminology',
  'Demography',
  'Social Welfare',
  
  // Humanities & Arts
  'History',
  'English',
  'Comparative Literature',
  'Linguistics',
  'Philosophy',
  'Religious Studies',
  'Art History',
  'Music',
  'Theater & Dance',
  'Film & Media Studies',
  'Art Practice',
  'Design',
  'Architecture',
  
  // Area Studies
  'African American Studies',
  'Asian American Studies',
  'Chicano/Latino Studies',
  'Middle Eastern Studies',
  'East Asian Studies',
  'European Studies',
  'Latin American Studies',
  'Global Studies',
  
  // Communication & Media
  'Communications',
  'Journalism',
  'Media Studies',
  'Public Relations',
  'Advertising',
  
  // Education
  'Education',
  'Child Development',
  'Human Development',
  
  // Environmental Studies
  'Environmental Science',
  'Environmental Studies',
  'Conservation Biology',
  'Climate Science',
  'Sustainability',
  
  // Health Sciences
  'Health Sciences',
  'Nutrition Science',
  'Kinesiology',
  'Exercise Science',
  
  // Interdisciplinary
  'Information',
  'Science & Technology Studies',
  'Computational Biology',
  'Biophysics',
  'Engineering Science',
  'Applied Science & Technology',
].sort()

// Common aliases for quick matching
export const MAJOR_ALIASES: Record<string, string> = {
  'EECS': 'Electrical Engineering & Computer Sciences',
  'CS': 'Computer Science',
  'MCB': 'Molecular & Cell Biology',
  'Econ': 'Economics',
  'Psych': 'Psychology',
  'Poli Sci': 'Political Science',
  'Comm': 'Communications',
  'Math': 'Mathematics',
  'Stats': 'Statistics',
  'ChemE': 'Chemical Engineering',
  'MechE': 'Mechanical Engineering',
  'CivE': 'Civil Engineering',
  'BioE': 'Bioengineering',
  'MatSci': 'Materials Science & Engineering',
  'Chem': 'Chemistry',
  'Bio': 'Biology',
  'CompSci': 'Computer Science',
  'Biz': 'Business Administration',
  'Bus Admin': 'Business Administration',
  'Env Sci': 'Environmental Science',
  'Env Studies': 'Environmental Studies',
  'Pub Health': 'Public Health',
  'Neuro': 'Neuroscience',
  'Anthro': 'Anthropology',
  'Soc': 'Sociology',
  'IR': 'International Relations',
}

