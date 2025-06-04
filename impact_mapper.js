// impact_mapper.js - Система маппинга для расчета импакт-скора событий

/**
 * Маппинг стран на экономическую значимость (1-10)
 * Учитывает размер экономики, влияние на глобальные рынки и криптовалюты
 */
const COUNTRY_IMPACT_MAP = {
  // Мегарынки (10) - США, Китай
  'USA': 10,
  'China': 10,
  
  // Крупные развитые экономики (8-9)
  'Germany': 9,
  'Japan': 9,
  'UK': 9,
  'France': 8,
  'Italy': 8,
  'Canada': 8,
  'South Korea': 8,
  'Australia': 7,
  
  // Развивающиеся гиганты (7-8)
  'India': 8,
  'Brazil': 7,
  'Russia': 7,
  'Mexico': 6,
  
  // Криптофрендли юрисдикции (6-7)
  'Singapore': 7,
  'Switzerland': 6,
  'Netherlands': 6,
  
  // Нефтяные державы (5-6)
  'Saudi Arabia': 6,
  'Iran': 5,
  'Iraq': 5,
  'Kuwait': 5,
  'Norway': 6,
  
  // Средние экономики (4-5)
  'Spain': 5,
  'Taiwan': 5,
  'Thailand': 4,
  'Malaysia': 4,
  'Indonesia': 5,
  'Philippines': 4,
  'Vietnam': 4,
  'Pakistan': 4,
  'Egypt': 4,
  'South Africa': 4,
  'Nigeria': 4,
  'Kenya': 3,
  'Ghana': 3,
  
  // Исторические державы (4-5)
  'USSR': 8,
  'Soviet Union': 8,
  
  // Малые развитые (3-4)
  'New Zealand': 4,
  'Finland': 4,
  'Denmark': 4,
  
  // Развивающиеся средние (2-3)
  'Morocco': 3,
  'Tunisia': 3,
  'Algeria': 3,
  'Libya': 3,
  'Ethiopia': 2,
  'Uganda': 2,
  'Tanzania': 2,
  'Zambia': 2,
  'Zimbabwe': 2,
  'Mozambique': 2,
  'Angola': 3,
  'Cameroon': 2,
  'Mali': 2,
  'Niger': 2,
  'Chad': 2,
  'Sudan': 2,
  'South Sudan': 2,
  
  // Малые государства (1-2)
  'Botswana': 2,
  'Lesotho': 1,
  'Swaziland (Eswatini)': 1,
  'Gambia': 1,
  'Sierra Leone': 1,
  'Guinea': 1,
  'Burkina Faso': 1,
  'Benin': 1,
  'Togo': 1,
  'Central African Republic': 1,
  'Equatorial Guinea': 1,
  'Gabon': 2,
  'Congo (Brazzaville)': 2,
  'Congo (DRC)': 2,
  'Rwanda': 1,
  'Burundi': 1,
  'Djibouti': 1,
  'Eritrea': 1,
  'Somalia': 1,
  'Comoros': 1,
  'Seychelles': 1,
  'Mauritania': 1,
  'Cape Verde': 1,
  'Maldives': 1,
  'Bhutan': 1,
  
  // Исторические регионы
  'Persia': 4,
  'Babylon': 2,
  'Central Asia': 3,
  'Uzbekistan': 2,
  'Kazakhstan': 3,
  'Malaya': 3,
  'Sri Lanka': 2
};

/**
 * Маппинг типов событий на импакт (1-10)
 * Учитывает потенциальное влияние на экономику и финансовые рынки
 */
const EVENT_TYPE_IMPACT_MAP = {
  // Экономические кризисы и реформы (8-10)
  'Economic Crisis': 10,
  'Economic Reform': 8,
  'Economic Policy': 7,
  'Financial Technology': 9,
  'Economic Development': 6,
  'Economic Integration': 7,
  'Economic Boom': 8,
  'Economic Shift': 7,
  'Economic Aid': 5,
  'Economic Nationalism': 6,
  'Economic Innovation': 7,
  'Economic/Infrastructure': 6,
  'Economic/Social': 5,
  'Economic/Cultural': 4,
  'Economic/Social Reform Plan': 7,
  'International Economic Agreement': 8,
  'International Economic Integration': 8,
  'International Trade Membership': 7,
  
  // Военные конфликты и политическая нестабильность (7-10)
  'War': 9,
  'Civil War': 8,
  'Military Conflict': 8,
  'Military Coup': 9,
  'Coup': 9,
  'Coup d\'état': 9,
  'Revolution': 9,
  'Political Revolution': 9,
  'Military Invasion': 9,
  'Military Occupation': 8,
  'Terrorism': 8,
  'Domestic Terrorism': 7,
  'Battle': 7,
  'Military Battle': 7,
  'Armed Rebellion': 7,
  'Rebellion': 7,
  'Military Rebellion': 7,
  'Political Rebellion': 7,
  'Insurgency': 7,
  'CounterUnknownInsurgency': 6,
  'Revolt': 7,
  'Political Uprising': 7,
  'Democratic Uprising': 7,
  'Military Aggression': 8,
  'Military Campaign': 7,
  'Military Offensive': 7,
  'Military Operation': 6,
  'Conflict': 6,
  'International Conflict': 8,
  'Regional Conflict': 6,
  'Ethnic Conflict': 6,
  'Religious War': 7,
  'Religious/Military War': 7,
  'Colonial War': 6,
  'Nuclear Test': 9,
  'Nuclear Accident': 10,
  'Military/Atomic Warfare': 10,
  
  // Политические изменения (5-8)
  'Political Change': 6,
  'Political Transition': 7,
  'Political Crisis': 8,
  'Independence': 8,
  'Independence Declaration': 8,
  'Independence Movement': 7,
  'Country Formation': 8,
  'State Formation': 8,
  'State Establishment': 8,
  'Political Formation': 6,
  'Government Change': 7,
  'Leadership Change': 7,
  'Election': 6,
  'General Election': 6,
  'General Elections': 6,
  'Electoral Victory': 5,
  'Electoral Reform': 5,
  'Political Party Formation': 4,
  'Constitutional': 6,
  'Constitutional Amendment': 6,
  'Constitutional Reform': 6,
  'Constitutional Development': 5,
  'Constitutional Adoption': 6,
  'Constitutional/Legal': 5,
  'Legal Reform': 5,
  'Legal Framework': 5,
  'Legislative': 5,
  'Legislation': 5,
  'Political Reform': 6,
  'Political/Economic Reform': 7,
  'Political/Social Reform': 5,
  'Administrative': 3,
  'Administrative Change': 4,
  'Administrative Reorganization': 4,
  'Referendum': 6,
  'Political Union': 7,
  'Political Unification': 7,
  'Unification': 7,
  'Union': 7,
  'Country Unification': 8,
  'Federation': 7,
  'Annexation': 7,
  'Political Annexation': 7,
  'Territorial Acquisition': 6,
  'Territorial Expansion': 6,
  'Partition': 8,
  'Political Separation': 7,
  'Secession Attempt': 7,
  'Political/Secession': 7,
  'Sovereignty Transition': 7,
  
  // Природные и техногенные катастрофы (6-9)
  'Natural Disaster': 7,
  'Disaster': 7,
  'Famine': 6,
  'Pandemic': 9,
  'Health Crisis': 8,
  'Industrial Disaster': 7,
  'Industrial Accident': 6,
  'Maritime Disaster': 5,
  'Accident': 4,
  'Aviation': 4,
  'Nuclear Energy': 6,
  'Spacecraft Accident': 5,
  'Space Exploration Disaster': 5,
  'Structural Failure': 5,
  'Environmental': 5,
  'Environmental Policy': 5,
  'Environmental Legislation': 5,
  'Environmental/Economic Policy': 6,
  'Environmental/Social': 4,
  
  // Дипломатия и международные отношения (4-7)
  'Diplomatic': 5,
  'Diplomatic Agreement': 6,
  'Diplomatic Event': 5,
  'International Agreement': 7,
  'International Treaty': 7,
  'Treaty': 6,
  'Peace Treaty': 7,
  'Peace Agreement': 7,
  'Peace Process': 6,
  'Peace/Security': 6,
  'International Conference': 5,
  'International Summit': 6,
  'Conference': 4,
  'Diplomatic Meeting': 4,
  'Diplomatic Mission': 4,
  'Diplomatic Policy': 5,
  'Diplomatic Recognition': 5,
  'International Recognition': 6,
  'Diplomatic Statement': 3,
  'International Event': 4,
  'International Relations': 5,
  'International Politics': 5,
  'International': 4,
  'International Cooperation': 5,
  'International Crisis': 8,
  'International Integration': 6,
  'International Incident': 6,
  'Diplomatic Incident': 6,
  'International Organization': 5,
  'International Policy': 5,
  'Foreign Policy': 5,
  'International Finance': 7,
  'Negotiation': 4,
  
  // Социальные и культурные события (2-6)
  'Social': 4,
  'Social Movement': 5,
  'Social Reform': 5,
  'Social Policy': 4,
  'Social Justice': 5,
  'Social Unrest': 6,
  'Civil Unrest': 6,
  'Social Welfare': 4,
  'Social Welfare Legislation': 4,
  'Social Welfare Program': 4,
  'Social Movement/Legal': 5,
  'Political/Social': 5,
  'Political/Social Movement': 5,
  'Economic/Social': 4,
  'Environmental/Social': 3,
  'Mass Protest': 6,
  'Protest Movement': 5,
  'Protests': 5,
  'Violent Protest': 6,
  'Civil Disobedience': 5,
  'Civil Disobedience Movement': 5,
  'Labor Movement': 5,
  'National Movement': 5,
  'Resistance Movement': 5,
  'Cultural': 3,
  'Cultural Change': 4,
  'Cultural Development': 3,
  'Cultural Policy': 3,
  'Cultural Shift': 4,
  'Cultural Heritage': 2,
  'Cultural Celebration': 2,
  'Cultural Flourishing': 3,
  'Cultural Infrastructure': 3,
  'Cultural and Political Movement': 5,
  'Cultural/Economic': 4,
  'Cultural/Legal': 4,
  'Cultural/Political': 4,
  'Cultural/Religious': 3,
  'Cultural/Religious Exchange': 3,
  'Religious': 4,
  'Religious Policy': 4,
  'Religious Reformation': 5,
  'Religious Conversion': 4,
  'Religious Spread': 3,
  'Religious/Cultural': 3,
  'Religious/Political': 5,
  'Religious/Court': 3,
  'Religious Shrine': 2,
  
  // Преступность и правосудие (4-7)
  'Criminal Incident': 4,
  'Assassination Attempt': 7,
  'Political Assassination': 8,
  'Execution': 5,
  'Judicial Execution': 5,
  'Massacre': 7,
  'Pogrom': 7,
  'Genocide': 9,
  'Civil Rights Violation': 6,
  'Human Rights Improvement': 5,
  'Civil Rights': 5,
  'Corruption Investigation': 5,
  'Corruption Scandal': 6,
  'Political Corruption': 6,
  'Political Scandal': 6,
  'Justice System': 4,
  'Judicial': 4,
  'Judicial/Political': 5,
  'Judiciary': 4,
  'Legal': 4,
  'Legal Code Introduction': 4,
  'Legal Inquiry': 4,
  'Legal System Implementation': 4,
  'Legal/Constitutional': 5,
  'Legal/Political': 5,
  'Legal/Social': 4,
  'Legal Land Rights': 4,
  'Gun Violence': 5,
  'Security Incident': 5,
  'Security Policy': 5,
  
  // Технологии и наука (3-7)
  'Technology': 5,
  'Technological Advancement': 6,
  'Innovation': 6,
  'Scientific': 4,
  'Scientific Achievement': 5,
  'Scientific Organization': 4,
  'Space Exploration': 4,
  'Space Agency': 4,
  'Discovery': 4,
  'Archaeological Discovery': 3,
  'Medical': 5,
  'Engineering Achievement': 5,
  'Engineering Marvel': 5,
  'Infrastructure': 4,
  'Infrastructure Development': 5,
  'Political/Infrastructure': 4,
  'Transportation': 4,
  'Rail': 4,
  'Telecommunications': 5,
  'Media': 3,
  'Media Development': 4,
  'Aviation': 4,
  'Maritime': 3,
  'Military/Technology': 6,
  'Military/Science': 5,
  
  // Образование и здравоохранение (2-5)
  'Education': 3,
  'Education Development': 4,
  'Education Policy': 4,
  'Educational Development': 4,
  'Educational Reform': 4,
  'Health': 4,
  'Healthcare': 4,
  'Health Policy': 4,
  'Public Health': 5,
  'Population Control Policy': 4,
  
  // Спорт и развлечения (1-3)
  'Sport': 2,
  'Sports': 2,
  'Sporting Event': 2,
  'International Sports Event': 3,
  'World Expo': 3,
  'World\'s Fair': 3,
  'International Exhibition': 3,
  
  // Историческое и культурное наследие (1-3)
  'Historical': 2,
  'Historical Period': 3,
  'Historical Reconciliation': 4,
  'Commemoration': 2,
  'National Commemoration': 3,
  'Monument': 2,
  'Mausoleum': 2,
  'Prehistoric Monument': 2,
  'Architectural': 2,
  'Architectural/Defensive': 3,
  'Literature': 2,
  'Artistic Achievement': 2,
  
  // Прочие низкоимпактные события (1-3)
  'Settlement': 2,
  'City Foundation': 3,
  'Urban Development': 3,
  'Colonial Settlement': 3,
  'Trade Route Development': 4,
  'Exploration': 3,
  'Colonial': 4,
  'Colonial Administration': 4,
  'Colonial Expansion': 5,
  'Colonial Legislation': 4,
  'Colonial Occupation': 5,
  'Colonial Rule': 5,
  'Colonial Subjugation': 5,
  'End of Colonial Rule': 6,
  'Protectorate Establishment': 4,
  'Foundational': 4,
  'Foundational Document': 5,
  'Wildlife Conservation': 2,
  'Agricultural Development': 3,
  'Agricultural Policy': 3,
  'Agricultural Revolution': 5,
  'Land Policy': 4,
  'Land Reform': 5,
  'Housing Policy': 3,
  'Modernization Policy': 4,
  'Modernization/Expansion': 4
};

/**
 * Маппинг исходов на модификаторы импакта (множители)
 */
const OUTCOME_IMPACT_MAP = {
  'Positive': 0.8,     // Позитивные события обычно меньше влияют на волатильность
  'Negative': 1.3,     // Негативные события сильнее влияют на рынки
  'Mixed': 1.0,        // Смешанные результаты - нейтральный множитель
  'Ongoing': 1.1       // Продолжающиеся события создают неопределенность
};

/**
 * Коэффициенты для расчета итогового импакт-скора
 */
const IMPACT_COEFFICIENTS = {
  country: 0.4,        // 40% - страна (где произошло)
  eventType: 0.5,      // 50% - тип события (что произошло)
  outcome: 0.1         // 10% - исход (как закончилось)
};

/**
 * Рассчитывает импакт-скор события
 * @param {string} country - Страна события
 * @param {string} eventType - Тип события
 * @param {string} outcome - Исход события
 * @returns {number} Импакт-скор от 0 до 10
 */
function calculateEventImpactScore(country, eventType, outcome) {
  // Получаем базовые значения или используем дефолтные
  const countryScore = COUNTRY_IMPACT_MAP[country] || 2; // Дефолт для неизвестных стран
  const eventTypeScore = EVENT_TYPE_IMPACT_MAP[eventType] || 3; // Дефолт для неизвестных типов
  const outcomeMultiplier = OUTCOME_IMPACT_MAP[outcome] || 1.0; // Дефолт для неизвестных исходов
  
  // Рассчитываем взвешенный балл
  const weightedScore = (
    countryScore * IMPACT_COEFFICIENTS.country +
    eventTypeScore * IMPACT_COEFFICIENTS.eventType
  ) * outcomeMultiplier;
  
  // Ограничиваем результат диапазоном 0-10
  return Math.min(Math.max(weightedScore, 0), 10);
}

/**
 * Получает все уникальные значения для отладки
 */
function getUniqueMappingValues() {
  return {
    countries: Object.keys(COUNTRY_IMPACT_MAP),
    eventTypes: Object.keys(EVENT_TYPE_IMPACT_MAP),
    outcomes: Object.keys(OUTCOME_IMPACT_MAP)
  };
}

/**
 * Проверяет покрытие маппинга для данных из CSV
 */
function checkMappingCoverage(uniqueValues) {
  const coverage = {
    countries: {
      mapped: 0,
      unmapped: [],
      total: uniqueValues.countries ? uniqueValues.countries.length : 0
    },
    eventTypes: {
      mapped: 0,
      unmapped: [],
      total: uniqueValues.eventTypes ? uniqueValues.eventTypes.length : 0
    },
    outcomes: {
      mapped: 0,
      unmapped: [],
      total: uniqueValues.outcomes ? uniqueValues.outcomes.length : 0
    }
  };
  
  // Проверяем страны
  if (uniqueValues.countries) {
    uniqueValues.countries.forEach(country => {
      if (COUNTRY_IMPACT_MAP[country]) {
        coverage.countries.mapped++;
      } else {
        coverage.countries.unmapped.push(country);
      }
    });
  }
  
  // Проверяем типы событий
  if (uniqueValues.eventTypes) {
    uniqueValues.eventTypes.forEach(type => {
      if (EVENT_TYPE_IMPACT_MAP[type]) {
        coverage.eventTypes.mapped++;
      } else {
        coverage.eventTypes.unmapped.push(type);
      }
    });
  }
  
  // Проверяем исходы
  if (uniqueValues.outcomes) {
    uniqueValues.outcomes.forEach(outcome => {
      if (OUTCOME_IMPACT_MAP[outcome]) {
        coverage.outcomes.mapped++;
      } else {
        coverage.outcomes.unmapped.push(outcome);
      }
    });
  }
  
  return coverage;
}

module.exports = {
  calculateEventImpactScore,
  getUniqueMappingValues,
  checkMappingCoverage,
  COUNTRY_IMPACT_MAP,
  EVENT_TYPE_IMPACT_MAP,
  OUTCOME_IMPACT_MAP,
  IMPACT_COEFFICIENTS
};