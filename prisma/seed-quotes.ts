import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================
// MOTIVATIONAL QUOTES (with authors)
// =============================================
const motivationalQuotes = [
  // English
  { text: 'The greatest wealth is health.', author: 'Virgil', language: 'en', category: 'motivational' },
  { text: 'Take care of your body. It is the only place you have to live.', author: 'Jim Rohn', language: 'en', category: 'motivational' },
  { text: 'Happiness is not something ready-made. It comes from your own actions.', author: 'Dalai Lama', language: 'en', category: 'motivational' },
  { text: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott', language: 'en', category: 'motivational' },
  { text: 'You yourself, as much as anybody in the entire universe, deserve your love and affection.', author: 'Buddha', language: 'en', category: 'motivational' },
  { text: 'Wellness is the complete integration of body, mind, and spirit.', author: 'Greg Anderson', language: 'en', category: 'motivational' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs', language: 'en', category: 'motivational' },
  { text: 'Your time is limited, don\'t waste it living someone else\'s life.', author: 'Steve Jobs', language: 'en', category: 'motivational' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein', language: 'en', category: 'motivational' },
  { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt', language: 'en', category: 'motivational' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu', language: 'en', category: 'motivational' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson', language: 'en', category: 'motivational' },
  { text: 'The mind is everything. What you think you become.', author: 'Buddha', language: 'en', category: 'motivational' },
  { text: 'Health is not valued till sickness comes.', author: 'Thomas Fuller', language: 'en', category: 'motivational' },
  { text: 'To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.', author: 'Buddha', language: 'en', category: 'motivational' },

  // Spanish
  { text: 'La mayor riqueza es la salud.', author: 'Virgilio', language: 'es', category: 'motivational' },
  { text: 'Cuida tu cuerpo. Es el único lugar donde tienes que vivir.', author: 'Jim Rohn', language: 'es', category: 'motivational' },
  { text: 'La felicidad no es algo ya hecho. Viene de tus propias acciones.', author: 'Dalai Lama', language: 'es', category: 'motivational' },
  { text: 'Casi todo funcionará de nuevo si lo desconectas por unos minutos, incluido tú.', author: 'Anne Lamott', language: 'es', category: 'motivational' },
  { text: 'Tú mismo, tanto como cualquiera en todo el universo, mereces tu amor y afecto.', author: 'Buda', language: 'es', category: 'motivational' },
  { text: 'El bienestar es la integración completa de cuerpo, mente y espíritu.', author: 'Greg Anderson', language: 'es', category: 'motivational' },
  { text: 'La única forma de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs', language: 'es', category: 'motivational' },
  { text: 'Tu tiempo es limitado, no lo desperdicies viviendo la vida de otra persona.', author: 'Steve Jobs', language: 'es', category: 'motivational' },
  { text: 'En medio de cada dificultad reside la oportunidad.', author: 'Albert Einstein', language: 'es', category: 'motivational' },
  { text: 'Cree que puedes y ya estás a medio camino.', author: 'Theodore Roosevelt', language: 'es', category: 'motivational' },
  { text: 'El viaje de mil millas comienza con un solo paso.', author: 'Lao Tse', language: 'es', category: 'motivational' },
  { text: 'Lo que está detrás de nosotros y lo que está delante son asuntos pequeños comparados con lo que está dentro de nosotros.', author: 'Ralph Waldo Emerson', language: 'es', category: 'motivational' },
  { text: 'La mente lo es todo. Lo que piensas te conviertes.', author: 'Buda', language: 'es', category: 'motivational' },
  { text: 'La salud no se valora hasta que llega la enfermedad.', author: 'Thomas Fuller', language: 'es', category: 'motivational' },
  { text: 'Mantener el cuerpo en buena salud es un deber, de lo contrario no podremos mantener nuestra mente fuerte y clara.', author: 'Buda', language: 'es', category: 'motivational' },

  // Portuguese
  { text: 'A maior riqueza é a saúde.', author: 'Virgílio', language: 'pt', category: 'motivational' },
  { text: 'Cuide do seu corpo. É o único lugar onde você tem que viver.', author: 'Jim Rohn', language: 'pt', category: 'motivational' },
  { text: 'A felicidade não é algo pronto. Vem das suas próprias ações.', author: 'Dalai Lama', language: 'pt', category: 'motivational' },
  { text: 'Quase tudo funcionará novamente se você o desligar por alguns minutos, incluindo você.', author: 'Anne Lamott', language: 'pt', category: 'motivational' },
  { text: 'Você mesmo, tanto quanto qualquer pessoa no universo inteiro, merece seu amor e afeição.', author: 'Buda', language: 'pt', category: 'motivational' },
  { text: 'Bem-estar é a integração completa de corpo, mente e espírito.', author: 'Greg Anderson', language: 'pt', category: 'motivational' },
  { text: 'A única forma de fazer um grande trabalho é amar o que você faz.', author: 'Steve Jobs', language: 'pt', category: 'motivational' },
  { text: 'Seu tempo é limitado, não o desperdice vivendo a vida de outra pessoa.', author: 'Steve Jobs', language: 'pt', category: 'motivational' },
  { text: 'No meio de cada dificuldade reside a oportunidade.', author: 'Albert Einstein', language: 'pt', category: 'motivational' },
  { text: 'Acredite que você pode e você já está no meio do caminho.', author: 'Theodore Roosevelt', language: 'pt', category: 'motivational' },
  { text: 'A jornada de mil milhas começa com um único passo.', author: 'Lao Tzu', language: 'pt', category: 'motivational' },
  { text: 'O que está atrás de nós e o que está diante de nós são questões pequenas comparadas ao que está dentro de nós.', author: 'Ralph Waldo Emerson', language: 'pt', category: 'motivational' },
  { text: 'A mente é tudo. O que você pensa, você se torna.', author: 'Buda', language: 'pt', category: 'motivational' },
  { text: 'A saúde não é valorizada até que a doença venha.', author: 'Thomas Fuller', language: 'pt', category: 'motivational' },
  { text: 'Manter o corpo em boa saúde é um dever, caso contrário não poderemos manter nossa mente forte e clara.', author: 'Buda', language: 'pt', category: 'motivational' },

  // French
  { text: 'La plus grande richesse est la santé.', author: 'Virgile', language: 'fr', category: 'motivational' },
  { text: 'Prenez soin de votre corps. C\'est le seul endroit où vous devez vivre.', author: 'Jim Rohn', language: 'fr', category: 'motivational' },
  { text: 'Le bonheur n\'est pas quelque chose de tout fait. Il vient de vos propres actions.', author: 'Dalaï Lama', language: 'fr', category: 'motivational' },
  { text: 'Presque tout fonctionnera à nouveau si vous le débranchez quelques minutes, y compris vous.', author: 'Anne Lamott', language: 'fr', category: 'motivational' },
  { text: 'Vous-même, autant que n\'importe qui dans l\'univers entier, méritez votre amour et affection.', author: 'Bouddha', language: 'fr', category: 'motivational' },
  { text: 'Le bien-être est l\'intégration complète du corps, de l\'esprit et de l\'âme.', author: 'Greg Anderson', language: 'fr', category: 'motivational' },
  { text: 'La seule façon de faire du bon travail est d\'aimer ce que vous faites.', author: 'Steve Jobs', language: 'fr', category: 'motivational' },
  { text: 'Votre temps est limité, ne le gaspillez pas à vivre la vie de quelqu\'un d\'autre.', author: 'Steve Jobs', language: 'fr', category: 'motivational' },
  { text: 'Au milieu de chaque difficulté se trouve une opportunité.', author: 'Albert Einstein', language: 'fr', category: 'motivational' },
  { text: 'Croyez que vous le pouvez et vous êtes à mi-chemin.', author: 'Theodore Roosevelt', language: 'fr', category: 'motivational' },
  { text: 'Le voyage de mille lieues commence par un seul pas.', author: 'Lao Tseu', language: 'fr', category: 'motivational' },
  { text: 'Ce qui est derrière nous et ce qui est devant nous sont de petites choses comparées à ce qui est en nous.', author: 'Ralph Waldo Emerson', language: 'fr', category: 'motivational' },
  { text: 'L\'esprit est tout. Ce que vous pensez, vous le devenez.', author: 'Bouddha', language: 'fr', category: 'motivational' },
  { text: 'La santé n\'est pas appréciée tant que la maladie ne vient pas.', author: 'Thomas Fuller', language: 'fr', category: 'motivational' },
  { text: 'Garder le corps en bonne santé est un devoir, sinon nous ne pourrons pas garder notre esprit fort et clair.', author: 'Bouddha', language: 'fr', category: 'motivational' },

  // Chinese
  { text: '最大的财富是健康。', author: '维吉尔', language: 'zh', category: 'motivational' },
  { text: '照顾好您的身体，这是您唯一居住的地方。', author: '吉姆·罗恩', language: 'zh', category: 'motivational' },
  { text: '幸福不是现成的，它来自您的行动。', author: '达赖喇嘛', language: 'zh', category: 'motivational' },
  { text: '几乎所有东西拔掉插头几分钟后都能重新工作，包括您自己。', author: '安妮·拉莫特', language: 'zh', category: 'motivational' },
  { text: '您自己，和宇宙中的任何人一样，值得您的爱和关怀。', author: '佛陀', language: 'zh', category: 'motivational' },
  { text: '健康是身体、心灵和精神的完全整合。', author: '格雷格·安德森', language: 'zh', category: 'motivational' },
  { text: '成就伟大工作的唯一方法就是热爱您所做的事。', author: '史蒂夫·乔布斯', language: 'zh', category: 'motivational' },
  { text: '您的时间有限，不要浪费在过别人的生活上。', author: '史蒂夫·乔布斯', language: 'zh', category: 'motivational' },
  { text: '每个困难的中间都蕴藏着机会。', author: '阿尔伯特·爱因斯坦', language: 'zh', category: 'motivational' },
  { text: '相信您可以，您就已经走了一半的路。', author: '西奥多·罗斯福', language: 'zh', category: 'motivational' },
  { text: '千里之行，始于足下。', author: '老子', language: 'zh', category: 'motivational' },
  { text: '我们身后的和我们面前的，与我们内心的相比都是小事。', author: '拉尔夫·沃尔多·爱默生', language: 'zh', category: 'motivational' },
  { text: '心即一切。您想什么，您就成为什么。', author: '佛陀', language: 'zh', category: 'motivational' },
  { text: '健康在疾病来临之前不被珍视。', author: '托马斯·富勒', language: 'zh', category: 'motivational' },
  { text: '保持身体健康是一种责任，否则我们将无法保持头脑坚强和清晰。', author: '佛陀', language: 'zh', category: 'motivational' },
];

// =============================================
// DAILY TIPS
// =============================================
const dailyTips = [
  // English
  { text: 'Take a 5-minute breathing break when feeling stressed', language: 'en', category: 'tip' },
  { text: 'Drink a glass of water before each meal', language: 'en', category: 'tip' },
  { text: 'Aim for 7-8 hours of sleep tonight', language: 'en', category: 'tip' },
  { text: 'Write down 3 things you are grateful for', language: 'en', category: 'tip' },
  { text: 'Take a short walk after lunch', language: 'en', category: 'tip' },
  { text: 'Stretch for 5 minutes every hour at your desk', language: 'en', category: 'tip' },
  { text: 'Practice mindful eating — slow down and savor each bite', language: 'en', category: 'tip' },
  { text: 'Limit screen time 1 hour before bed', language: 'en', category: 'tip' },
  { text: 'Start your morning with a glass of warm lemon water', language: 'en', category: 'tip' },
  { text: 'Practice deep breathing for 2 minutes before meetings', language: 'en', category: 'tip' },
  { text: 'Take the stairs instead of the elevator today', language: 'en', category: 'tip' },
  { text: 'Set a daily intention each morning', language: 'en', category: 'tip' },
  { text: 'Spend 10 minutes in nature today', language: 'en', category: 'tip' },
  { text: 'Write in a journal for 5 minutes before bed', language: 'en', category: 'tip' },
  { text: 'Replace one sugary drink with water today', language: 'en', category: 'tip' },

  // Spanish
  { text: 'Toma un descanso de respiración de 5 minutos cuando te sientas estresado', language: 'es', category: 'tip' },
  { text: 'Bebe un vaso de agua antes de cada comida', language: 'es', category: 'tip' },
  { text: 'Intenta dormir 7-8 horas esta noche', language: 'es', category: 'tip' },
  { text: 'Escribe 3 cosas por las que estás agradecido', language: 'es', category: 'tip' },
  { text: 'Da un corto paseo después del almuerzo', language: 'es', category: 'tip' },
  { text: 'Estírate 5 minutos cada hora en tu escritorio', language: 'es', category: 'tip' },
  { text: 'Practica la alimentación consciente — come despacio y saborea cada bocado', language: 'es', category: 'tip' },
  { text: 'Limita el tiempo de pantalla 1 hora antes de dormir', language: 'es', category: 'tip' },
  { text: 'Comienza tu mañana con un vaso de agua tibia con limón', language: 'es', category: 'tip' },
  { text: 'Practica respiración profunda durante 2 minutos antes de las reuniones', language: 'es', category: 'tip' },
  { text: 'Toma las escaleras en lugar del ascensor hoy', language: 'es', category: 'tip' },
  { text: 'Establece una intención diaria cada mañana', language: 'es', category: 'tip' },
  { text: 'Pasa 10 minutos en la naturaleza hoy', language: 'es', category: 'tip' },
  { text: 'Escribe en un diario durante 5 minutos antes de dormir', language: 'es', category: 'tip' },
  { text: 'Reemplaza una bebida azucarada con agua hoy', language: 'es', category: 'tip' },

  // Portuguese
  { text: 'Faça uma pausa de respiração de 5 minutos quando se sentir estressado', language: 'pt', category: 'tip' },
  { text: 'Beba um copo de água antes de cada refeição', language: 'pt', category: 'tip' },
  { text: 'Tente dormir 7-8 horas esta noite', language: 'pt', category: 'tip' },
  { text: 'Escreva 3 coisas pelas quais você é grato', language: 'pt', category: 'tip' },
  { text: 'Dê uma caminhada curta após o almoço', language: 'pt', category: 'tip' },
  { text: 'Alongue-se por 5 minutos a cada hora na mesa', language: 'pt', category: 'tip' },
  { text: 'Pratique alimentação consciente — coma devagar e saboreie cada mordida', language: 'pt', category: 'tip' },
  { text: 'Limite o tempo de tela 1 hora antes de dormir', language: 'pt', category: 'tip' },
  { text: 'Comece sua manhã com um copo de água morna com limão', language: 'pt', category: 'tip' },
  { text: 'Pratique respiração profunda por 2 minutos antes das reuniões', language: 'pt', category: 'tip' },
  { text: 'Use as escadas em vez do elevador hoje', language: 'pt', category: 'tip' },
  { text: 'Defina uma intenção diária cada manhã', language: 'pt', category: 'tip' },
  { text: 'Passe 10 minutos na natureza hoje', language: 'pt', category: 'tip' },
  { text: 'Escreva em um diário por 5 minutos antes de dormir', language: 'pt', category: 'tip' },
  { text: 'Substitua uma bebida açucarada por água hoje', language: 'pt', category: 'tip' },

  // French
  { text: 'Prenez une pause de respiration de 5 minutes quand vous êtes stressé', language: 'fr', category: 'tip' },
  { text: 'Buvez un verre d\'eau avant chaque repas', language: 'fr', category: 'tip' },
  { text: 'Visez 7-8 heures de sommeil cette nuit', language: 'fr', category: 'tip' },
  { text: 'Écrivez 3 choses pour lesquelles vous êtes reconnaissant', language: 'fr', category: 'tip' },
  { text: 'Faites une courte promenade après le déjeuner', language: 'fr', category: 'tip' },
  { text: 'Étirez-vous 5 minutes chaque heure à votre bureau', language: 'fr', category: 'tip' },
  { text: 'Pratiquez l\'alimentation consciente — ralentissez et savourez chaque bouchée', language: 'fr', category: 'tip' },
  { text: 'Limitez le temps d\'écran 1 heure avant le coucher', language: 'fr', category: 'tip' },
  { text: 'Commencez votre matinée avec un verre d\'eau tiède au citron', language: 'fr', category: 'tip' },
  { text: 'Pratiquez la respiration profonde pendant 2 minutes avant les réunions', language: 'fr', category: 'tip' },
  { text: 'Prenez les escaliers au lieu de l\'ascenseur aujourd\'hui', language: 'fr', category: 'tip' },
  { text: 'Définissez une intention quotidienne chaque matin', language: 'fr', category: 'tip' },
  { text: 'Passez 10 minutes dans la nature aujourd\'hui', language: 'fr', category: 'tip' },
  { text: 'Écrivez dans un journal pendant 5 minutes avant de dormir', language: 'fr', category: 'tip' },
  { text: 'Remplacez une boisson sucrée par de l\'eau aujourd\'hui', language: 'fr', category: 'tip' },

  // Chinese
  { text: '感到压力时，做5分钟呼吸休息', language: 'zh', category: 'tip' },
  { text: '每餐前喝一杯水', language: 'zh', category: 'tip' },
  { text: '今晚目标睡眠7-8小时', language: 'zh', category: 'tip' },
  { text: '写下3件您感恩的事', language: 'zh', category: 'tip' },
  { text: '午餐后散步一会儿', language: 'zh', category: 'tip' },
  { text: '每小时在办公桌前伸展5分钟', language: 'zh', category: 'tip' },
  { text: '练习正念饮食——放慢速度，品味每一口', language: 'zh', category: 'tip' },
  { text: '睡前1小时限制屏幕时间', language: 'zh', category: 'tip' },
  { text: '早上用一杯温柠檬水开始新的一天', language: 'zh', category: 'tip' },
  { text: '会议前做2分钟深呼吸', language: 'zh', category: 'tip' },
  { text: '今天走楼梯代替乘电梯', language: 'zh', category: 'tip' },
  { text: '每天早晨设定一个日常意图', language: 'zh', category: 'tip' },
  { text: '今天在自然中度过10分钟', language: 'zh', category: 'tip' },
  { text: '睡前写5分钟日记', language: 'zh', category: 'tip' },
  { text: '今天用一杯水代替一杯含糖饮料', language: 'zh', category: 'tip' },
];

// =============================================
// DAILY AFFIRMATIONS
// =============================================
const dailyAffirmations = [
  // English
  { text: 'I am enough just as I am.', language: 'en', category: 'affirmation' },
  { text: 'I deserve peace and happiness.', language: 'en', category: 'affirmation' },
  { text: 'Every day is a new opportunity to grow.', language: 'en', category: 'affirmation' },
  { text: 'I am strong and capable of overcoming any challenge.', language: 'en', category: 'affirmation' },
  { text: 'My mental health is a priority.', language: 'en', category: 'affirmation' },
  { text: 'I choose to let go of what I cannot control.', language: 'en', category: 'affirmation' },
  { text: 'I am worthy of love and respect.', language: 'en', category: 'affirmation' },
  { text: 'I embrace change as a path to growth.', language: 'en', category: 'affirmation' },
  { text: 'My feelings are valid and important.', language: 'en', category: 'affirmation' },
  { text: 'I am resilient and can handle whatever comes my way.', language: 'en', category: 'affirmation' },
  { text: 'I am becoming a better version of myself each day.', language: 'en', category: 'affirmation' },
  { text: 'I choose thoughts that nourish and support me.', language: 'en', category: 'affirmation' },
  { text: 'I trust the journey and embrace uncertainty.', language: 'en', category: 'affirmation' },
  { text: 'My potential is limitless and my future is bright.', language: 'en', category: 'affirmation' },
  { text: 'I radiate positivity and attract good things into my life.', language: 'en', category: 'affirmation' },

  // Spanish
  { text: 'Soy suficiente tal como soy.', language: 'es', category: 'affirmation' },
  { text: 'Merezco paz y felicidad.', language: 'es', category: 'affirmation' },
  { text: 'Cada día es una nueva oportunidad para crecer.', language: 'es', category: 'affirmation' },
  { text: 'Soy fuerte y capaz de superar cualquier desafío.', language: 'es', category: 'affirmation' },
  { text: 'Mi salud mental es una prioridad.', language: 'es', category: 'affirmation' },
  { text: 'Elijo soltar lo que no puedo controlar.', language: 'es', category: 'affirmation' },
  { text: 'Soy digno de amor y respeto.', language: 'es', category: 'affirmation' },
  { text: 'Abrazo el cambio como camino al crecimiento.', language: 'es', category: 'affirmation' },
  { text: 'Mis sentimientos son válidos e importantes.', language: 'es', category: 'affirmation' },
  { text: 'Soy resiliente y puedo manejar lo que venga.', language: 'es', category: 'affirmation' },
  { text: 'Cada día me convierto en una mejor versión de mí mismo.', language: 'es', category: 'affirmation' },
  { text: 'Elijo pensamientos que me nutren y apoyan.', language: 'es', category: 'affirmation' },
  { text: 'Confío en el camino y abrazo la incertidumbre.', language: 'es', category: 'affirmation' },
  { text: 'Mi potencial es ilimitado y mi futuro es brillante.', language: 'es', category: 'affirmation' },
  { text: 'Irradio positividad y atraigo cosas buenas a mi vida.', language: 'es', category: 'affirmation' },

  // Portuguese
  { text: 'Eu sou suficiente assim como sou.', language: 'pt', category: 'affirmation' },
  { text: 'Eu mereço paz e felicidade.', language: 'pt', category: 'affirmation' },
  { text: 'Cada dia é uma nova oportunidade de crescer.', language: 'pt', category: 'affirmation' },
  { text: 'Eu sou forte e capaz de superar qualquer desafio.', language: 'pt', category: 'affirmation' },
  { text: 'Minha saúde mental é uma prioridade.', language: 'pt', category: 'affirmation' },
  { text: 'Eu escolho deixar ir o que não posso controlar.', language: 'pt', category: 'affirmation' },
  { text: 'Eu sou digno de amor e respeito.', language: 'pt', category: 'affirmation' },
  { text: 'Eu abraço a mudança como caminho para o crescimento.', language: 'pt', category: 'affirmation' },
  { text: 'Meus sentimentos são válidos e importantes.', language: 'pt', category: 'affirmation' },
  { text: 'Eu sou resiliente e posso lidar com o que vier.', language: 'pt', category: 'affirmation' },
  { text: 'Cada dia me torno uma versão melhor de mim mesmo.', language: 'pt', category: 'affirmation' },
  { text: 'Eu escolho pensamentos que me nutrem e apoiam.', language: 'pt', category: 'affirmation' },
  { text: 'Eu confio na jornada e abraço a incerteza.', language: 'pt', category: 'affirmation' },
  { text: 'Meu potencial é ilimitado e meu futuro é brilhante.', language: 'pt', category: 'affirmation' },
  { text: 'Eu irradio positividade e atraio coisas boas para minha vida.', language: 'pt', category: 'affirmation' },

  // French
  { text: 'Je suis suffisant tel que je suis.', language: 'fr', category: 'affirmation' },
  { text: 'Je mérite la paix et le bonheur.', language: 'fr', category: 'affirmation' },
  { text: 'Chaque jour est une nouvelle opportunité de grandir.', language: 'fr', category: 'affirmation' },
  { text: 'Je suis fort et capable de surmonter tout défi.', language: 'fr', category: 'affirmation' },
  { text: 'Ma santé mentale est une priorité.', language: 'fr', category: 'affirmation' },
  { text: 'Je choisis de laisser aller ce que je ne peux pas contrôler.', language: 'fr', category: 'affirmation' },
  { text: 'Je suis digne d\'amour et de respect.', language: 'fr', category: 'affirmation' },
  { text: 'J\'embrasse le changement comme chemin vers la croissance.', language: 'fr', category: 'affirmation' },
  { text: 'Mes sentiments sont valides et importants.', language: 'fr', category: 'affirmation' },
  { text: 'Je suis résilient et peux faire face à tout ce qui vient.', language: 'fr', category: 'affirmation' },
  { text: 'Chaque jour je deviens une meilleure version de moi-même.', language: 'fr', category: 'affirmation' },
  { text: 'Je choisis des pensées qui me nourrissent et me soutiennent.', language: 'fr', category: 'affirmation' },
  { text: 'Je fais confiance au chemin et j\'embrasse l\'incertitude.', language: 'fr', category: 'affirmation' },
  { text: 'Mon potentiel est illimité et mon avenir est brillant.', language: 'fr', category: 'affirmation' },
  { text: 'Je rayonne de positivité et j\'attire de bonnes choses dans ma vie.', language: 'fr', category: 'affirmation' },

  // Chinese
  { text: '我就是我，已经足够了。', language: 'zh', category: 'affirmation' },
  { text: '我值得拥有和平与幸福。', language: 'zh', category: 'affirmation' },
  { text: '每一天都是成长的新机会。', language: 'zh', category: 'affirmation' },
  { text: '我坚强，能够克服任何挑战。', language: 'zh', category: 'affirmation' },
  { text: '我的心理健康是优先事项。', language: 'zh', category: 'affirmation' },
  { text: '我选择放下我无法控制的事。', language: 'zh', category: 'affirmation' },
  { text: '我值得被爱和尊重。', language: 'zh', category: 'affirmation' },
  { text: '我拥抱变化作为成长的路径。', language: 'zh', category: 'affirmation' },
  { text: '我的感受是有效且重要的。', language: 'zh', category: 'affirmation' },
  { text: '我坚韧，能够应对一切。', language: 'zh', category: 'affirmation' },
  { text: '每一天我都在成为更好的自己。', language: 'zh', category: 'affirmation' },
  { text: '我选择滋养和支持我的想法。', language: 'zh', category: 'affirmation' },
  { text: '我信任这段旅程，拥抱不确定性。', language: 'zh', category: 'affirmation' },
  { text: '我的潜力是无限的，我的未来是光明的。', language: 'zh', category: 'affirmation' },
  { text: '我散发积极，吸引美好的事物进入我的生活。', language: 'zh', category: 'affirmation' },
];

async function main() {
  console.log('Seeding motivational quotes, tips, and affirmations...');

  // Clear existing data
  await prisma.motivationalQuote.deleteMany({});

  const allData = [...motivationalQuotes, ...dailyTips, ...dailyAffirmations];

  let created = 0;
  for (const item of allData) {
    await prisma.motivationalQuote.create({
      data: {
        text: item.text,
        author: (item as any).author || null,
        category: item.category,
        language: item.language,
        active: true,
      },
    });
    created++;
  }

  console.log(`✅ Seeded ${created} items:`);
  console.log(`   - ${motivationalQuotes.length} motivational quotes`);
  console.log(`   - ${dailyTips.length} daily tips`);
  console.log(`   - ${dailyAffirmations.length} daily affirmations`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
