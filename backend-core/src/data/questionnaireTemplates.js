/**
 * Templates de questionários dinâmicos por matéria
 * Cada matéria tem um conjunto de perguntas específicas para entender
 * melhor o perfil e objetivos do aluno.
 */

const SUBJECTS = {
  // IDIOMAS
  'Inglês': {
    icon: '🇬🇧',
    description: 'Aprenda inglês do básico ao avançado',
    category: 'Idiomas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Qual é seu nível atual de inglês?',
        options: [
          { value: 'beginner', label: 'Iniciante (nunca estudei)' },
          { value: 'basic', label: 'Básico (sei algumas palavras e frases)' },
          { value: 'intermediate', label: 'Intermediário (converso sobre temas simples)' },
          { value: 'upper_intermediate', label: 'Intermediário-Avançado (converso bem mas preciso melhorar)' },
          { value: 'advanced', label: 'Avançado (sou fluente mas quero aperfeiçoar)' }
        ],
        required: true
      },
      {
        id: 'objectives',
        type: 'multiple-choice',
        question: 'Quais são seus principais objetivos com o inglês?',
        options: [
          'Viajar e se comunicar no exterior',
          'Melhorar no trabalho/carreira',
          'Passar em exames (TOEFL, IELTS, Cambridge)',
          'Consumir conteúdo (filmes, séries, livros)',
          'Estudar/morar fora do país',
          'Comunicação com familiares/amigos'
        ],
        required: true,
        allowMultiple: true
      },
      {
        id: 'previous_study',
        type: 'text',
        question: 'Você já estudou inglês antes? Por quanto tempo?',
        placeholder: 'Ex: Estudei 2 anos na escola, fiz um curso online de 6 meses...',
        required: false
      },
      {
        id: 'certification',
        type: 'single-choice',
        question: 'Tem alguma certificação de proficiência?',
        options: [
          { value: 'none', label: 'Não tenho' },
          { value: 'toefl', label: 'TOEFL' },
          { value: 'ielts', label: 'IELTS' },
          { value: 'cambridge', label: 'Cambridge (FCE, CAE, CPE)' },
          { value: 'other', label: 'Outra' }
        ],
        required: false
      },
      {
        id: 'focus',
        type: 'single-choice',
        question: 'Prefere aulas focadas em:',
        options: [
          { value: 'conversation', label: 'Conversação e fluência' },
          { value: 'grammar', label: 'Gramática e escrita' },
          { value: 'balanced', label: 'Equilíbrio entre conversação e gramática' },
          { value: 'business', label: 'Inglês para negócios' }
        ],
        required: true
      },
      {
        id: 'difficulties',
        type: 'multiple-choice',
        question: 'Quais são suas maiores dificuldades?',
        options: [
          'Pronúncia',
          'Compreensão oral (listening)',
          'Gramática',
          'Vocabulário',
          'Escrita',
          'Vergonha de falar',
          'Falta de prática'
        ],
        required: false,
        allowMultiple: true
      }
    ]
  },

  'Espanhol': {
    icon: '🇪🇸',
    description: 'Domine o espanhol para viagens e negócios',
    category: 'Idiomas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Qual é seu nível atual de espanhol?',
        options: [
          { value: 'beginner', label: 'Iniciante (nunca estudei)' },
          { value: 'basic', label: 'Básico (entendo algumas coisas por ser parecido com português)' },
          { value: 'intermediate', label: 'Intermediário (converso sobre temas simples)' },
          { value: 'advanced', label: 'Avançado (sou fluente)' }
        ],
        required: true
      },
      {
        id: 'objectives',
        type: 'multiple-choice',
        question: 'Por que você quer aprender espanhol?',
        options: [
          'Viagens pela América Latina/Espanha',
          'Trabalho/carreira',
          'Família ou amigos que falam espanhol',
          'Consumir conteúdo (séries, músicas, livros)',
          'Morar em país hispanófono',
          'Preparação para provas'
        ],
        required: true,
        allowMultiple: true
      },
      {
        id: 'variant',
        type: 'single-choice',
        question: 'Qual variante do espanhol te interessa mais?',
        options: [
          { value: 'latam', label: 'Espanhol Latino-americano' },
          { value: 'spain', label: 'Espanhol da Espanha' },
          { value: 'both', label: 'Ambos' }
        ],
        required: true
      }
    ]
  },

  'Francês': {
    icon: '🇫🇷',
    description: 'Aprenda o idioma da cultura francesa',
    category: 'Idiomas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Qual é seu nível atual de francês?',
        options: [
          { value: 'beginner', label: 'Iniciante' },
          { value: 'basic', label: 'Básico (A1-A2)' },
          { value: 'intermediate', label: 'Intermediário (B1-B2)' },
          { value: 'advanced', label: 'Avançado (C1-C2)' }
        ],
        required: true
      },
      {
        id: 'objectives',
        type: 'multiple-choice',
        question: 'Quais são seus objetivos?',
        options: [
          'Viagens para França/países francófonos',
          'Estudar na França/Canadá',
          'Carreira profissional',
          'Cultura e literatura',
          'Imigração para país francófono'
        ],
        required: true,
        allowMultiple: true
      }
    ]
  },

  // EXATAS
  'Matemática': {
    icon: '📐',
    description: 'Álgebra, geometria, cálculo e muito mais',
    category: 'Exatas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Para que nível você precisa de aulas?',
        options: [
          { value: 'fundamental', label: 'Ensino Fundamental' },
          { value: 'medio', label: 'Ensino Médio' },
          { value: 'vestibular', label: 'Vestibular/ENEM' },
          { value: 'superior', label: 'Ensino Superior' },
          { value: 'concursos', label: 'Concursos Públicos' }
        ],
        required: true
      },
      {
        id: 'topics',
        type: 'multiple-choice',
        question: 'Quais tópicos você tem mais dificuldade?',
        options: [
          'Álgebra (equações, funções)',
          'Geometria plana e espacial',
          'Trigonometria',
          'Cálculo (limites, derivadas, integrais)',
          'Estatística e probabilidade',
          'Matemática financeira',
          'Aritmética básica'
        ],
        required: true,
        allowMultiple: true
      },
      {
        id: 'goal',
        type: 'single-choice',
        question: 'Qual é seu objetivo principal?',
        options: [
          { value: 'school', label: 'Melhorar as notas na escola' },
          { value: 'exam', label: 'Passar em uma prova específica' },
          { value: 'foundation', label: 'Fortalecer a base matemática' },
          { value: 'advanced', label: 'Aprofundar conhecimentos' }
        ],
        required: true
      },
      {
        id: 'learning_style',
        type: 'single-choice',
        question: 'Como você prefere aprender matemática?',
        options: [
          { value: 'exercises', label: 'Muitos exercícios práticos' },
          { value: 'theory', label: 'Entender a teoria profundamente primeiro' },
          { value: 'visual', label: 'Abordagem visual com gráficos e diagramas' },
          { value: 'applied', label: 'Problemas aplicados ao mundo real' }
        ],
        required: true
      }
    ]
  },

  'Física': {
    icon: '⚛️',
    description: 'Mecânica, termodinâmica e muito mais',
    category: 'Exatas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Qual nível de física você precisa?',
        options: [
          { value: 'medio', label: 'Ensino Médio' },
          { value: 'vestibular', label: 'Vestibular/ENEM' },
          { value: 'superior', label: 'Ensino Superior' }
        ],
        required: true
      },
      {
        id: 'topics',
        type: 'multiple-choice',
        question: 'Quais áreas você precisa estudar?',
        options: [
          'Mecânica (cinemática, dinâmica)',
          'Termodinâmica',
          'Óptica',
          'Eletricidade e magnetismo',
          'Ondas e acústica',
          'Física moderna (relatividade, quântica)'
        ],
        required: true,
        allowMultiple: true
      }
    ]
  },

  'Química': {
    icon: '🧪',
    description: 'Química orgânica e inorgânica',
    category: 'Exatas',
    questions: [
      {
        id: 'level',
        type: 'single-choice',
        question: 'Qual nível de química você precisa?',
        options: [
          { value: 'medio', label: 'Ensino Médio' },
          { value: 'vestibular', label: 'Vestibular/ENEM' },
          { value: 'superior', label: 'Ensino Superior' }
        ],
        required: true
      },
      {
        id: 'areas',
        type: 'multiple-choice',
        question: 'Quais áreas você precisa estudar?',
        options: [
          'Química geral (tabela periódica, ligações)',
          'Química orgânica',
          'Físico-química (termoquímica, cinética)',
          'Química inorgânica',
          'Estequiometria',
          'Bioquímica'
        ],
        required: true,
        allowMultiple: true
      }
    ]
  },

  // PROGRAMAÇÃO
  'Programação': {
    icon: '💻',
    description: 'Python, JavaScript, Java e mais',
    category: 'Programação e Tecnologia',
    questions: [
      {
        id: 'experience',
        type: 'single-choice',
        question: 'Qual é sua experiência com programação?',
        options: [
          { value: 'none', label: 'Nunca programei' },
          { value: 'beginner', label: 'Iniciante (conheço conceitos básicos)' },
          { value: 'intermediate', label: 'Intermediário (já fiz alguns projetos)' },
          { value: 'advanced', label: 'Avançado (quero me especializar)' }
        ],
        required: true
      },
      {
        id: 'languages',
        type: 'multiple-choice',
        question: 'Quais linguagens você quer aprender?',
        options: [
          'Python',
          'JavaScript/TypeScript',
          'Java',
          'C/C++',
          'C#',
          'Go',
          'Rust',
          'PHP',
          'Ruby'
        ],
        required: true,
        allowMultiple: true
      },
      {
        id: 'area',
        type: 'single-choice',
        question: 'Qual área te interessa mais?',
        options: [
          { value: 'web_frontend', label: 'Desenvolvimento Web Frontend' },
          { value: 'web_backend', label: 'Desenvolvimento Web Backend' },
          { value: 'mobile', label: 'Desenvolvimento Mobile' },
          { value: 'data_science', label: 'Ciência de Dados/Machine Learning' },
          { value: 'games', label: 'Desenvolvimento de Games' },
          { value: 'systems', label: 'Sistemas/DevOps' },
          { value: 'general', label: 'Programação geral (lógica e fundamentos)' }
        ],
        required: true
      },
      {
        id: 'goal',
        type: 'single-choice',
        question: 'Qual é seu objetivo principal?',
        options: [
          { value: 'career_change', label: 'Trocar de carreira para TI' },
          { value: 'job_improve', label: 'Melhorar no trabalho atual' },
          { value: 'freelance', label: 'Trabalhar como freelancer' },
          { value: 'projects', label: 'Criar projetos pessoais' },
          { value: 'study', label: 'Faculdade/estudos' }
        ],
        required: true
      },
      {
        id: 'learning_style',
        type: 'single-choice',
        question: 'Como você prefere aprender?',
        options: [
          { value: 'projects', label: 'Aprendendo com projetos práticos' },
          { value: 'theory_first', label: 'Entendendo a teoria primeiro' },
          { value: 'exercises', label: 'Resolvendo exercícios/desafios' },
          { value: 'reading', label: 'Lendo documentação e tutoriais' }
        ],
        required: true
      }
    ]
  },

  // PREPARATÓRIOS
  'ENEM': {
    icon: '🎓',
    description: 'Preparação completa para o ENEM',
    category: 'Preparação para Provas',
    questions: [
      {
        id: 'year',
        type: 'single-choice',
        question: 'Em que ano você vai fazer o ENEM?',
        options: [
          { value: '2025', label: '2025' },
          { value: '2026', label: '2026' },
          { value: '2027', label: '2027 ou depois' }
        ],
        required: true
      },
      {
        id: 'areas',
        type: 'multiple-choice',
        question: 'Quais áreas você tem mais dificuldade?',
        options: [
          'Matemática e suas Tecnologias',
          'Linguagens, Códigos e suas Tecnologias',
          'Ciências Humanas',
          'Ciências da Natureza',
          'Redação'
        ],
        required: true,
        allowMultiple: true
      },
      {
        id: 'previous_score',
        type: 'single-choice',
        question: 'Já fez o ENEM antes? Qual foi sua nota aproximada?',
        options: [
          { value: 'never', label: 'Nunca fiz' },
          { value: 'below_500', label: 'Abaixo de 500' },
          { value: '500_600', label: 'Entre 500 e 600' },
          { value: '600_700', label: 'Entre 600 e 700' },
          { value: 'above_700', label: 'Acima de 700' }
        ],
        required: true
      },
      {
        id: 'course',
        type: 'text',
        question: 'Qual curso pretende fazer na faculdade?',
        placeholder: 'Ex: Medicina, Engenharia, Direito...',
        required: true
      },
      {
        id: 'study_hours',
        type: 'scale',
        question: 'Quantas horas por semana pode estudar?',
        min: 5,
        max: 40,
        step: 5,
        unit: 'horas/semana',
        required: true
      },
      {
        id: 'intensity',
        type: 'single-choice',
        question: 'Prefere um cronograma:',
        options: [
          { value: 'intensive', label: 'Intensivo (mais horas, menos tempo)' },
          { value: 'distributed', label: 'Distribuído (menos horas, mais consistência)' }
        ],
        required: true
      }
    ]
  },

  'Vestibular': {
    icon: '🏛️',
    description: 'Vestibulares específicos',
    category: 'Preparação para Provas',
    questions: [
      {
        id: 'vestibular',
        type: 'text',
        question: 'Para qual vestibular você está estudando?',
        placeholder: 'Ex: FUVEST, UNICAMP, ITA, IME...',
        required: true
      },
      {
        id: 'course',
        type: 'text',
        question: 'Qual curso pretende fazer?',
        placeholder: 'Ex: Medicina, Engenharia, Direito...',
        required: true
      },
      {
        id: 'areas',
        type: 'multiple-choice',
        question: 'Quais disciplinas você precisa de mais ajuda?',
        options: [
          'Matemática',
          'Física',
          'Química',
          'Biologia',
          'Português/Literatura',
          'História',
          'Geografia',
          'Inglês',
          'Redação'
        ],
        required: true,
        allowMultiple: true
      }
    ]
  },

  'Concursos Públicos': {
    icon: '📋',
    description: 'Preparação para concursos',
    category: 'Preparação para Provas',
    questions: [
      {
        id: 'area',
        type: 'single-choice',
        question: 'Qual área de concurso te interessa?',
        options: [
          { value: 'fiscal', label: 'Área Fiscal (Receita, TCU, CGU)' },
          { value: 'bancario', label: 'Área Bancária' },
          { value: 'policial', label: 'Área Policial (PF, PRF, PC)' },
          { value: 'tribunais', label: 'Tribunais' },
          { value: 'tecnico', label: 'Técnico Administrativo' },
          { value: 'outro', label: 'Outro' }
        ],
        required: true
      },
      {
        id: 'subjects',
        type: 'multiple-choice',
        question: 'Quais matérias você precisa estudar?',
        options: [
          'Português',
          'Raciocínio Lógico',
          'Direito Constitucional',
          'Direito Administrativo',
          'Informática',
          'Matemática Financeira',
          'Contabilidade',
          'Economia'
        ],
        required: true,
        allowMultiple: true
      }
    ]
  }
};

// Questionário genérico para matérias não listadas
const GENERIC_QUESTIONNAIRE = {
  icon: '❓',
  description: 'Outra matéria ou objetivo específico',
  category: 'Outros',
  questions: [
    {
      id: 'subject_detail',
      type: 'text',
      question: 'Qual matéria ou habilidade você deseja aprender?',
      placeholder: 'Ex: Violão, Culinária Vegana, Yoga...',
      required: true
    },
    {
      id: 'experience',
      type: 'single-choice',
      question: 'Você já tem alguma experiência prévia nessa área?',
      options: [
        { value: 'none', label: 'Nenhuma, sou totalmente iniciante' },
        { value: 'basic', label: 'Tenho noções básicas' },
        { value: 'intermediate', label: 'Tenho experiência intermediária' },
        { value: 'advanced', label: 'Tenho experiência avançada e quero aprimorar' }
      ],
      required: true
    },
    {
      id: 'goal',
      type: 'text',
      question: 'Qual é seu principal objetivo ao aprender isso?',
      placeholder: 'Ex: Tocar em uma banda, cozinhar para a família, melhorar a saúde...',
      required: true
    },
    {
      id: 'age_group',
      type: 'single-choice',
      question: 'Qual é sua faixa etária?',
      options: [
        { value: 'child', label: 'Até 12 anos' },
        { value: 'teen', label: '13 a 17 anos' },
        { value: 'young_adult', label: '18 a 25 anos' },
        { value: 'adult', label: '26 a 40 anos' },
        { value: 'mature', label: '41 a 60 anos' },
        { value: 'senior', label: 'Mais de 60 anos' }
      ],
      required: true
    },
    {
      id: 'education',
      type: 'single-choice',
      question: 'Qual é sua escolaridade atual?',
      options: [
        { value: 'fundamental_incomplete', label: 'Fundamental incompleto' },
        { value: 'fundamental', label: 'Fundamental completo' },
        { value: 'medio_incomplete', label: 'Médio incompleto' },
        { value: 'medio', label: 'Médio completo' },
        { value: 'superior_incomplete', label: 'Superior incompleto' },
        { value: 'superior', label: 'Superior completo' },
        { value: 'pos', label: 'Pós-graduação' }
      ],
      required: false
    },
    {
      id: 'learning_preference',
      type: 'scale',
      question: 'Você prefere aulas mais teóricas ou práticas?',
      min: 1,
      max: 10,
      step: 1,
      labels: { min: 'Totalmente teórico', max: 'Totalmente prático' },
      required: true
    },
    {
      id: 'special_needs',
      type: 'text',
      question: 'Tem alguma necessidade especial ou preferência de aprendizado?',
      placeholder: 'Opcional - Ex: Tenho déficit de atenção, aprendo melhor com música...',
      required: false
    }
  ]
};

// Lista completa de matérias para seleção
const SUBJECT_LIST = [
  // Idiomas
  { name: 'Inglês', icon: '🇬🇧', category: 'Idiomas', description: 'Aprenda inglês do básico ao avançado' },
  { name: 'Espanhol', icon: '🇪🇸', category: 'Idiomas', description: 'Domine o espanhol para viagens e negócios' },
  { name: 'Francês', icon: '🇫🇷', category: 'Idiomas', description: 'Aprenda o idioma da cultura francesa' },
  { name: 'Alemão', icon: '🇩🇪', category: 'Idiomas', description: 'Alemão para estudos e carreira' },
  { name: 'Italiano', icon: '🇮🇹', category: 'Idiomas', description: 'Italiano para cultura e viagens' },
  { name: 'Mandarim', icon: '🇨🇳', category: 'Idiomas', description: 'Chinês para negócios e cultura' },
  { name: 'Japonês', icon: '🇯🇵', category: 'Idiomas', description: 'Japonês para anime, cultura e negócios' },
  { name: 'Coreano', icon: '🇰🇷', category: 'Idiomas', description: 'K-pop, dramas e cultura coreana' },

  // Exatas
  { name: 'Matemática', icon: '📐', category: 'Exatas', description: 'Álgebra, geometria e cálculo' },
  { name: 'Física', icon: '⚛️', category: 'Exatas', description: 'Mecânica, termodinâmica e muito mais' },
  { name: 'Química', icon: '🧪', category: 'Exatas', description: 'Química orgânica e inorgânica' },
  { name: 'Estatística', icon: '📊', category: 'Exatas', description: 'Análise de dados e probabilidade' },

  // Programação
  { name: 'Programação', icon: '💻', category: 'Programação e Tecnologia', description: 'Python, JavaScript, Java e mais' },
  { name: 'Desenvolvimento Web', icon: '🌐', category: 'Programação e Tecnologia', description: 'HTML, CSS, React e frameworks' },
  { name: 'Ciência de Dados', icon: '📈', category: 'Programação e Tecnologia', description: 'Python, pandas, machine learning' },
  { name: 'Excel Avançado', icon: '📗', category: 'Programação e Tecnologia', description: 'Fórmulas, tabelas dinâmicas e automação' },

  // Humanas
  { name: 'Português', icon: '📖', category: 'Humanas', description: 'Gramática, redação e literatura' },
  { name: 'História', icon: '📜', category: 'Humanas', description: 'História do Brasil e mundial' },
  { name: 'Geografia', icon: '🌍', category: 'Humanas', description: 'Geografia física e humana' },
  { name: 'Filosofia', icon: '🤔', category: 'Humanas', description: 'Pensamento crítico e filosofia' },
  { name: 'Sociologia', icon: '👥', category: 'Humanas', description: 'Sociedade e relações humanas' },

  // Artes
  { name: 'Música', icon: '🎵', category: 'Artes e Criatividade', description: 'Teoria musical e instrumento' },
  { name: 'Desenho/Pintura', icon: '🎨', category: 'Artes e Criatividade', description: 'Arte tradicional e digital' },
  { name: 'Fotografia', icon: '📷', category: 'Artes e Criatividade', description: 'Técnicas e edição fotográfica' },

  // Profissional
  { name: 'Marketing Digital', icon: '📣', category: 'Profissional e Negócios', description: 'SEO, redes sociais e anúncios' },
  { name: 'Finanças Pessoais', icon: '💰', category: 'Profissional e Negócios', description: 'Investimentos e planejamento' },
  { name: 'Oratória', icon: '🎤', category: 'Profissional e Negócios', description: 'Falar em público com confiança' },

  // Preparatórios
  { name: 'ENEM', icon: '🎓', category: 'Preparação para Provas', description: 'Preparação completa para o ENEM' },
  { name: 'Vestibular', icon: '🏛️', category: 'Preparação para Provas', description: 'Vestibulares específicos' },
  { name: 'Concursos Públicos', icon: '📋', category: 'Preparação para Provas', description: 'Preparação para concursos' },

  // Outros
  { name: 'Outros', icon: '❓', category: 'Outros', description: 'Outra matéria ou objetivo específico' }
];

// Agrupar matérias por categoria
const SUBJECTS_BY_CATEGORY = SUBJECT_LIST.reduce((acc, subject) => {
  if (!acc[subject.category]) {
    acc[subject.category] = [];
  }
  acc[subject.category].push(subject);
  return acc;
}, {});

/**
 * Obtém o questionário para uma matéria específica
 * @param {string} subjectName - Nome da matéria
 * @returns {Object} - Template do questionário
 */
function getQuestionnaireForSubject(subjectName) {
  const template = SUBJECTS[subjectName];

  if (template) {
    return {
      subject: subjectName,
      ...template
    };
  }

  // Se não encontrar, retorna o questionário genérico
  return {
    subject: subjectName,
    ...GENERIC_QUESTIONNAIRE
  };
}

/**
 * Obtém a lista completa de matérias disponíveis
 * @returns {Array} - Lista de matérias
 */
function getSubjectList() {
  return SUBJECT_LIST;
}

/**
 * Obtém as matérias agrupadas por categoria
 * @returns {Object} - Matérias agrupadas
 */
function getSubjectsByCategory() {
  return SUBJECTS_BY_CATEGORY;
}

export {
  SUBJECTS,
  SUBJECT_LIST,
  SUBJECTS_BY_CATEGORY,
  GENERIC_QUESTIONNAIRE,
  getQuestionnaireForSubject,
  getSubjectList,
  getSubjectsByCategory
};

export default {
  getQuestionnaireForSubject,
  getSubjectList,
  getSubjectsByCategory
};
