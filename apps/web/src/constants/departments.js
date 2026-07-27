export const DEPARTMENTS_AND_FACULTIES = [
  'Faculty of Management',
  'Faculty of Applied Sciences',
  'Faculty of Medicine',
  'Faculty of Technological Studies',
  'Faculty of Animal Science & Export Agriculture',
  'Faculty of Science & Technology',
  'Procurement Management Division',
  'Finance Division',
  'Registrar Office',
  'Vice Chancellor Office',
  'Supplies Division',
  'Works Division',
  'Examination Division',
  'Student Affairs Division',
  'Library',
  'Security Unit',
  'General',
];

export const DEPARTMENTS_BY_FACULTY = {
  'Faculty of Management': [
    'Entrepreneurship & Management',
    'Hospitality, Tourism and Events Management',
    'Human Resources and development',
    'Department of English Language Teaching',
    'Faculty of Management (General)',
  ],
  'Faculty of Applied Sciences': [
    'Computer Science and Technology',
    'Science and Technology',
    'Mineral Resources & Technology',
    'Industrial Information Technology',
    'Faculty of Applied Sciences (General)',
  ],
  'Faculty of Medicine': [
    'Department of Medicine',
    'Faculty of Medicine (General)',
  ],
  'Faculty of Technological Studies': [
    'Department of Engineering Technology',
    'Department of Biosystems Technology',
    'Department of Information and Communication Technology',
    'Faculty of Technological Studies (General)',
  ],
  'Faculty of Animal Science & Export Agriculture': [
    'Animal Science',
    'Export Agriculture',
    'Tea Technology & Value Addition',
    'Palm and Latex Technology and Value Addition',
    'Aquatic Resources and Technology', 
    'Faculty of Animal Science & Export Agriculture (General)',
  ],
  'Faculty of Science & Technology': [
    'Department of Science & Technology',
    'Department of Applied Earth Sciences',
    'Faculty of Science & Technology (General)',
  ],
  'Procurement Management Division': ['Procurement Management Division', 'Procurement Section', 'Tender & Contracts Section'],
  'Finance Division': ['Finance Division', 'Accounts Section', 'Salaries & Payments', 'Budget Section'],
  'Registrar Office': ['Registrar Office', 'Main Secretariat', 'Legal & Council Affairs'],
  'Vice Chancellor Office': ['Vice Chancellor Office', 'Executive Secretariat', 'Internal Audit Unit'],
  'Supplies Division': ['Supplies Division', 'Store & Inventory', 'Logistics Section'],
  'Works Division': ['Works Division', 'Maintenance & Civil', 'Electrical & Mechanical'],
  'Examination Division': ['Examination Division', 'Exams Section', 'Records & Transcripts'],
  'Student Affairs Division': ['Student Affairs Division', 'Student Welfare', 'Hostel Administration'],
  'Library': ['Library', 'Main Library', 'Digital Resources Section'],
  'Security Unit': ['Security Unit', 'Main Campus Security', 'Surveillance'],
  'General': ['General Institutional Requirements'],
};

export const ALL_DEPARTMENTS = Object.values(DEPARTMENTS_BY_FACULTY).flat();

export const getFacultyForDepartment = (deptName) => {
  if (!deptName) return 'Faculty of Applied Sciences';
  const cleanTarget = String(deptName).trim().toLowerCase();
  for (const [faculty, depts] of Object.entries(DEPARTMENTS_BY_FACULTY)) {
    if (depts.some(d => d.trim().toLowerCase() === cleanTarget || cleanTarget.includes(d.trim().toLowerCase()))) {
      return faculty;
    }
  }
  return 'Faculty of Applied Sciences';
};

