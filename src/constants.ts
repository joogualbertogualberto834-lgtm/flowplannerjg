import { Theme } from './crosswordTypes';

export const THEMES: Theme[] = [
  {
    id: 'classic',
    name: 'Clássico (Dark)',
    bg: 'bg-[#E4E3E0]',
    gridBg: 'bg-[#141414]',
    cellBg: 'bg-[#E4E3E0]',
    cellText: 'text-[#141414]',
    blackCell: 'bg-[#141414]',
    activeCell: 'bg-[#F27D26]',
    activeWord: 'bg-[#F27D26]/20',
    correctCell: 'bg-[#22C55E]',
    incorrectCell: 'bg-[#EF4444]',
    font: 'font-sans',
    border: 'border-[#141414]'
  },
  {
    id: 'wood',
    name: 'Madeira (Scrabble)',
    bg: 'bg-[#5D4037]',
    gridBg: 'bg-[#3E2723]',
    cellBg: 'bg-[#D7CCC8]',
    cellText: 'text-[#3E2723]',
    blackCell: 'bg-[#3E2723]',
    activeCell: 'bg-[#FFB300]',
    activeWord: 'bg-[#FFB300]/30',
    correctCell: 'bg-[#4CAF50]',
    incorrectCell: 'bg-[#F44336]',
    font: 'font-serif',
    border: 'border-[#3E2723]',
    shadow: 'shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]',
    texture: 'https://www.transparenttextures.com/patterns/wood-pattern.png'
  },
  {
    id: 'crystal',
    name: 'Cristal (Neon)',
    bg: 'bg-[#0F172A]',
    gridBg: 'bg-[#1E293B]',
    cellBg: 'bg-[#334155]/50',
    cellText: 'text-cyan-400',
    blackCell: 'bg-[#020617]',
    activeCell: 'bg-cyan-500',
    activeWord: 'bg-cyan-500/20',
    correctCell: 'bg-emerald-500',
    incorrectCell: 'bg-rose-500',
    font: 'font-mono',
    border: 'border-cyan-500/50',
    shadow: 'shadow-[0_0_15px_rgba(34,211,238,0.3)]'
  },
  {
    id: 'stone',
    name: 'Pedra (Rúnico)',
    bg: 'bg-[#424242]',
    gridBg: 'bg-[#212121]',
    cellBg: 'bg-[#9E9E9E]',
    cellText: 'text-[#212121]',
    blackCell: 'bg-[#121212]',
    activeCell: 'bg-[#FF9800]',
    activeWord: 'bg-[#FF9800]/20',
    correctCell: 'bg-[#43A047]',
    incorrectCell: 'bg-[#E53935]',
    font: 'font-serif',
    border: 'border-[#212121]',
    texture: 'https://www.transparenttextures.com/patterns/stone-wall.png'
  },
  {
    id: 'parchment',
    name: 'Pergaminho (Antigo)',
    bg: 'bg-[#D7B588]',
    gridBg: 'bg-[#5D4037]',
    cellBg: 'bg-[#F5F5DC]',
    cellText: 'text-[#5D4037]',
    blackCell: 'bg-[#5D4037]',
    activeCell: 'bg-[#8D6E63]',
    activeWord: 'bg-[#8D6E63]/20',
    correctCell: 'bg-[#689F38]',
    incorrectCell: 'bg-[#D32F2F]',
    font: 'font-serif',
    border: 'border-[#5D4037]',
    texture: 'https://www.transparenttextures.com/patterns/parchment.png'
  }
];

export const SPECIALTIES = [
  {
    id: 'pediatria',
    name: 'Pediatria',
    themes: [
      'Doenças Exantemáticas',
      'Síndromes Respiratórias na Infância – Parte I',
      'Síndromes Respiratórias na Infância – Parte II',
      'Imunização',
      'Infecções do Trato Urinário',
      'Neonatologia I',
      'Neonatologia II',
      'Crescimento e seus Distúrbios',
      'Carência de Micronutrientes',
      'Puberdade e seus Distúrbios',
      'Desenvolvimento Infantil',
      'Aleitamento Materno + Diarreia Aguda'
    ]
  },
  {
    id: 'clinica-medica',
    name: 'Clínica Médica',
    themes: [
      'Síndrome Ictérica I (Hepatites)',
      'Síndrome Ictérica II (Doenças das Vias Biliares)',
      'Síndrome Diarreica',
      'Síndrome Metabólica I – HAS e Dislipidemia',
      'Síndrome Metabólica II – Diabetes e Obesidade',
      'Grandes Síndromes Endócrinas – Parte I (Tireoide)',
      'Grandes Síndromes Endócrinas – Parte II (Suprarrenal/Cálcio)',
      'Hipofunção Adrenal: Doença de Addison',
      'Terapia Intensiva',
      'Síndrome da Pneumonia Típica e Atípica',
      'Grandes Síndromes Bacterianas',
      'Síndromes de Imunodeficiência',
      'Síndromes Febris',
      'Tosse Crônica',
      'Dispneia (Doenças Vasculares, Obstrutivas e Restritivas)',
      'Geratria',
      'Epilepsia',
      'Síndrome Neurovascular',
      'Fraqueza Muscular',
      'Síndrome Álgica II – Cefaleias',
      'Síndromes Glomerulares e Doença Vascular Renal',
      'Síndrome Urêmica',
      'Distúrbio Hidroeletrolítico e Ácido-Básico',
      'Anemias – Parte I (Carenciais)',
      'Anemias – Parte II (Hemolíticas)',
      'Leucemias e Pancitopenia',
      'Linfonodo e Esplenomegalia',
      'Distúrbios da Hemostasia',
      'Artrites',
      'Colagenoses',
      'Vasculites',
      'Síndrome Edemigênica',
      'Síndrome Álgica IV – Dor Torácica – Parte I',
      'Síndrome Álgica IV – Dor Torácica – Parte II',
      'Taquiarritmias',
      'Bradiarritmias'
    ]
  },
  {
    id: 'cirurgia',
    name: 'Cirurgia',
    themes: [
      'Síndrome de Insuficiência Hepática',
      'Síndrome de Hipertensão Porta',
      'Síndrome Disfágica',
      'Síndrome Dispéptica e Doenças do TGI Superior',
      'Hemorragia Digestiva I – Abordagem e Conduta',
      'Síndrome Álgica I – Dor Abdominal',
      'Hemorragia Digestiva II – Proctologia',
      'Síndrome de Oclusão Intestinal (Aguda x Crônica)',
      'Oncologia II – Parte I (Próstata, Pulmão e Tireoide)',
      'Oncologia II – Parte II (Esôfago, Estômago, Colorretal, Pâncreas e Fígado)',
      'Síndrome Álgica III – Dor Lombar',
      'Trauma e suas Consequências I',
      'Trauma e suas Consequências II',
      'Perioperatório I',
      'Perioperatório II',
      'Especialidade Cirúrgica – Parte I',
      'Especialidade Cirúrgica – Parte II'
    ]
  },
  {
    id: 'ginecologia',
    name: 'Ginecologia',
    themes: [
      'Síndromes de Transmissão Sexual',
      'Oncologia I – Parte I (Mama e Ovário)',
      'Oncologia I – Parte II (Endométrio e Colo Uterino)',
      'Ciclo Menstrual, Distopia Genital e Incontinência Urinária',
      'Amenorreia, Infertilidade e Síndrome dos Ovários Policísticos',
      'Anticoncepção, Sangramentos Ginecológicos e Endometriose'
    ]
  },
  {
    id: 'obstetricia',
    name: 'Obstetrícia',
    themes: [
      'Sangramentos da Primeira Metade da Gravidez',
      'Doença Hemolítica Perinatal',
      'Sangramentos da Segunda Metade da Gravidez',
      'Doenças Clínicas na Gravidez',
      'Sofrimento Fetal, Avaliação da Vitalidade Fetal, Fórcipe e Puerpério',
      'Diagnóstico de Gravidez, Modificações do Organismo Materno, Pré-Natal',
      'Aconselhamento Genético',
      'O Parto'
    ]
  },
  {
    id: 'preventiva',
    name: 'Preventiva',
    themes: [
      'SUS – Evolução Histórica, Diretrizes, Propostas e Financiamento',
      'Medidas de Saúde Coletiva',
      'Estudos Epidemiológicos',
      'Epidemiologia Clínica',
      'Vigilância da Saúde e Ética Médica',
      'Declaração de Óbito e Saúde do Trabalhador',
      'Intoxicações e Acidentes por Animais Peçonhentos'
    ]
  },
  {
    id: 'especialidades',
    name: 'Outras Especialidades',
    themes: [
      'Otorrinolaringologia',
      'Oftalmologia',
      'PALS',
      'Psiquiatria',
      'Ortopedia',
      'Dermatologia'
    ]
  }
];
