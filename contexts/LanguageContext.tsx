import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: 'en' | 'pt';
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const translations = {
  en: {
    // Main Page
    'title': 'Fodinha Card Game',
    'join_or_create': 'Join or Create a Lobby',
    'your_name': 'Your Name',
    'select_lives': 'Select Lives',
    'lives_count': '{{count}} Lives',
    'create_new_lobby': 'Create New Lobby',
    'join_existing_lobby': 'Join Existing Lobby',
    'one_card_hand': '1 Card Hand',
    'max_card_hand': 'Max Card Hand',
    'game_id': 'Lobby ID',
    'join_lobby': 'Join Lobby',
    'game_created': 'Game Created!',
    'your_game_id': 'Your Game ID: {{id}}',
    'share_id': 'Share this ID with your friends to let them join.',
    'join_your_game': 'Join Your Game',
    'connecting': 'Connecting...',
    
    // Lobby
    'lobby': 'Lobby: {{id}}',
    'players_count': 'Players ({{current}} / {{max}})',
    'lives': 'Lives',
    'start_game_from': 'Start Game From',
    'one_card': '1 Card',
    'max_cards': 'Max Cards',
    'start_game': 'Start Game',
    'leave_lobby': 'Leave Lobby',
    'min_players_required': 'At least 2 players are required to start.',
    
    // Game Interface
    'game_room': 'Game Room: {{id}}',
    'leave_game': 'Leave Game',
    'players': 'Players',
    'eliminated': 'Eliminated',
    'waiting': 'Waiting...',
    'inactive': 'Inactive',
    'betting_phase': 'Betting Phase',
    'playing_phase': 'Playing Phase',
    'you': '(You)',
    
    // Game Status Messages
    'waiting_to_start': 'Waiting to start the next hand',
    'your_turn_bet': "It's your turn to place a bet!",
    'waiting_for_bet': 'Waiting for {{player}} to place a bet',
    'waiting_for_bets': 'Waiting for bets',
    'your_turn_play': "It's your turn to play a card!",
    'waiting_for_play': 'Waiting for {{player}} to play a card',
    'waiting_for_plays': 'Waiting for plays',
    'submitting_bet': 'Submitting Bet...',
    'playing_card': 'Playing...',
    
    // Betting
    'make_your_bet': 'Make Your Bet',
    'bet': 'Bet',
    'invalid_bet_error': 'Invalid bet: Total bets cannot equal the number of cards in the round.',
    'total_bets_so_far': 'Total bets so far: {{current}} / {{total}}',
    'needs_to_win': 'Needs to Win',
    
    // Cards and Game
    'middle_card': 'Middle Card',
    'manilha': 'Manilha',
    'round': 'Round {{current}} of {{total}}',
    'hand': 'Hand {{number}}',
    'multiplier': 'Multiplier: x{{value}}',
    'round_winner': '{{player}} won the round!',
    'tie_message': 'The round ended in a tie! Multiplier is now x{{value}}',
    'hand_complete': 'Hand {{prev}} complete! Starting hand {{current}} with {{cards}} cards per player',
    'round_complete': 'Round {{prev}} complete! Starting round {{current}}',
    'game_over': 'Game Over',
    'final_results': 'Final Results',
    'winner': 'Winner',
    'new_game': 'Return to Lobby',
    'your_hand': 'Your Hand',
    'played_cards': 'Played Cards',
    'other_players_cards': 'Other Players\' Cards',
    'wins': 'Wins',
    
    // Rules Section
    'how_to_play': '🎯 How to Play Fodinha',
    'game_overview': '📋 Game Overview',
    'game_overview_text': 'Fodinha is a Brazilian trick-taking card game where players try to predict exactly how many tricks (rounds) they will win. The goal is to make your exact bet - no more, no less!',
    'game_setup': '🎮 Game Setup',
    'game_setup_players': 'Players: 2-10 players',
    'game_setup_lives': 'Player Lives: Each player starts with 3, 5, or 7 lives',
    'game_setup_cards': 'Cards: 40-card deck (standard deck with 8, 9, 10 removed)',
    'card_hierarchy': '🃏 Card Hierarchy (Weakest to Strongest)',
    'card_hierarchy_progression': '4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3 < Manilha',
    'card_hierarchy_note': 'Manilha: The card that comes after the middle card (changes each hand)',
    'how_to_play_section': '🎯 How to Play',
    'betting_phase_rules': '1. Betting Phase',
    'betting_phase_text1': 'Look at your cards and predict how many tricks you\'ll win',
    'betting_phase_text2': 'Important: The last player cannot make a bet that would make the total bets equal to the number of cards',
    'betting_phase_text3': 'Example: In a 3-card hand, if bets total 2, the last player cannot bet 1',
    'playing_phase_rules': '2. Playing Phase',
    'playing_phase_text1': 'Players take turns playing one card',
    'playing_phase_text2': 'The highest card wins the trick (round)',
    'playing_phase_text3': 'The winner of each trick leads the next one',
    'playing_phase_text4': 'Card Cancellation: If two players play cards of the same strength, they cancel each other out',
    'scoring_rules': '3. Scoring',
    'scoring_text1': 'Exact Match: If you win exactly what you bet, you keep all your lives',
    'scoring_text2': 'Wrong Guess: If you win more or fewer tricks than you bet, you lose 1 life',
    'winning_elimination': '🏆 Winning & Elimination',
    'winning_text1': 'When you reach 0 lives, you\'re eliminated',
    'winning_text2': 'The last player remaining wins the game!',
    'winning_text3': 'Games get progressively harder as the number of cards increases, then decreases',
    'strategy_tips': '💡 Strategy Tips',
    'strategy_tip1': 'Count the Manilhas: There are 4 manilhas (one per suit) - track them carefully',
    'strategy_tip2': 'Watch the Bets: Use other players\' bets to estimate the strength of their hands',
    'strategy_tip3': 'Card Memory: Remember which high cards have been played',
    'strategy_tip4': 'Final Player Advantage: The last player to bet has more information but also restrictions',
    'special_rules': '👑 Special Rules',
    'special_rule1': 'Manilha Suits: In ties, manilha suits are ranked: ♣ (lowest) → ♥ → ♠ → ♦ (highest)',
    'special_rule2': 'Card Cancellation: Cards of the same strength cancel in pairs as they\'re played',
    'special_rule3': 'Crown Highlight: The current winning card in each trick is highlighted with a crown 👑',
    'pro_tip': '💡 Pro Tip: Take your time in the betting phase! Your success depends on accurately predicting your performance.',
    
    // Middle Card Workaround
    'all_cards_dealt': 'All 40 cards dealt to players',
    
    // Error Messages
    'failed_to_create': 'Failed to create game',
    'failed_to_join': 'Failed to join game',
    'failed_to_connect': 'Failed to connect to the game server',
    'connection_error': 'Connection error. Game continues via backup connection.',
    'reconnecting': 'Reconnecting...',
    'reconnected': 'Reconnected successfully',
    
    // Bug Report
    'report_bug': 'Report Bug',
    'describe_bug': 'Describe the bug',
    'bug_description_placeholder': 'Please describe what happened, what you expected to happen, and any steps to reproduce the issue...',
    'contact_info_optional': 'Contact Info (Optional)',
    'contact_placeholder': 'Email or other contact info (optional)',
    'game_info': 'Game Information',
    'cancel': 'Cancel',
    'send_report': 'Send Report',
    'sending': 'Sending...',
    'bug_report_sent': 'Bug Report Sent!',
    'bug_report_thanks': 'Thank you for helping us improve the game!',
    
    // Card Sorting
    'sort_by_strength': 'Sort cards by strength (weakest first)',
    'show_original_order': 'Show original card order',
  },
  
  pt: {
    // Página Principal
    'title': 'Jogo de Cartas Fodinha',
    'join_or_create': 'Entrar ou Criar um Lobby',
    'your_name': 'Seu Nome',
    'select_lives': 'Selecione Vidas',
    'lives_count': '{{count}} Vidas',
    'create_new_lobby': 'Criar Novo Lobby',
    'join_existing_lobby': 'Entrar em Lobby Existente',
    'one_card_hand': 'índio',
    'max_card_hand': 'Max Cartas',
    'game_id': 'Código do Lobby',
    'join_lobby': 'Entrar no Lobby',
    'game_created': 'Jogo Criado!',
    'your_game_id': 'Seu Código: {{id}}',
    'share_id': 'Compartilhe este código com seus amigos para eles entrarem.',
    'join_your_game': 'Entrar no Seu Jogo',
    'connecting': 'Conectando...',
    
    // Lobby
    'lobby': 'Lobby: {{id}}',
    'players_count': 'Jogadores ({{current}} / {{max}})',
    'lives': 'Vidas',
    'start_game_from': 'Começar Jogo Desde',
    'one_card': '1 Carta',
    'max_cards': 'Max Cartas',
    'start_game': 'Iniciar Jogo',
    'leave_lobby': 'Sair do Lobby',
    'min_players_required': 'Pelo menos 2 jogadores são necessários para iniciar.',
    
    // Interface do Jogo
    'game_room': 'Sala do Jogo: {{id}}',
    'leave_game': 'Sair do Jogo',
    'players': 'Jogadores',
    'eliminated': 'Eliminado',
    'waiting': 'Aguardando...',
    'inactive': 'Inativo',
    'betting_phase': 'Fase de Apostas',
    'playing_phase': 'Fase de Jogo',
    'you': '(Você)',
    
    // Mensagens de Status
    'waiting_to_start': 'Aguardando para começar a próxima mão',
    'your_turn_bet': 'É sua vez de fazer uma aposta!',
    'waiting_for_bet': 'Aguardando {{player}} fazer uma aposta',
    'waiting_for_bets': 'Aguardando apostas',
    'your_turn_play': 'É sua vez de jogar uma carta!',
    'waiting_for_play': 'Aguardando {{player}} jogar uma carta',
    'waiting_for_plays': 'Aguardando jogadas',
    'submitting_bet': 'Enviando Aposta...',
    'playing_card': 'Jogando...',
    
    // Apostas
    'make_your_bet': 'Faça Sua Aposta',
    'bet': 'Faz',
    'invalid_bet_error': 'Aposta inválida: O total de apostas não pode ser igual ao número de cartas na rodada.',
    'total_bets_so_far': 'Apostas até agora: {{current}} / {{total}}',
    'needs_to_win': 'Precisa Fazer',
    
    // Cartas e Jogo
    'middle_card': 'Carta do Meio',
    'manilha': 'Manilha',
    'round': 'Rodada {{current}} de {{total}}',
    'hand': 'Mão {{number}}',
    'multiplier': 'Multiplicador: x{{value}}',
    'round_winner': '{{player}} ganhou a rodada!',
    'tie_message': 'A rodada terminou empatada! Multiplicador agora é x{{value}}',
    'hand_complete': 'Mão {{prev}} completa! Iniciando mão {{current}} com {{cards}} cartas por jogador',
    'round_complete': 'Rodada {{prev}} completa! Iniciando rodada {{current}}',
    'game_over': 'Fim de Jogo',
    'final_results': 'Resultados Finais',
    'winner': 'Vencedor',
    'new_game': 'Voltar ao Lobby',
    'your_hand': 'Sua Mão',
    'played_cards': 'Cartas Jogadas',
    'other_players_cards': 'Cartas dos Outros Jogadores',
    'wins': 'Vitórias',
    
    // Seção de Regras
    'how_to_play': '🎯 Como Jogar Fodinha',
    'game_overview': '📋 Visão Geral do Jogo',
    'game_overview_text': 'Fodinha é um jogo de cartas brasileiro de vazas onde os jogadores tentam prever exatamente quantas vazas (rodadas) irão ganhar. O objetivo é fazer exatamente sua aposta - nem mais, nem menos!',
    'game_setup': '🎮 Configuração do Jogo',
    'game_setup_players': 'Jogadores: 2-10 jogadores',
    'game_setup_lives': 'Vidas dos Jogadores: Cada jogador começa com 3, 5 ou 7 vidas',
    'game_setup_cards': 'Cartas: Baralho de 40 cartas (baralho padrão sem 8, 9, 10)',
    'card_hierarchy': '🃏 Hierarquia das Cartas (Mais Fraca para Mais Forte)',
    'card_hierarchy_progression': '4 < 5 < 6 < 7 < Q < J < K < A < 2 < 3 < Manilha',
    'card_hierarchy_note': 'Manilha: A carta que vem depois da carta do meio (muda a cada mão)',
    'how_to_play_section': '🎯 Como Jogar',
    'betting_phase_rules': '1. Fase de Apostas',
    'betting_phase_text1': 'Olhe suas cartas e preveja quantas vazas você vai ganhar',
    'betting_phase_text2': 'Importante: O último jogador não pode fazer uma aposta que faria o total de apostas igual ao número de cartas',
    'betting_phase_text3': 'Exemplo: Em uma mão de 3 cartas, se as apostas totalizam 2, o último jogador não pode apostar 1',
    'playing_phase_rules': '2. Fase de Jogo',
    'playing_phase_text1': 'Jogadores se revezam jogando uma carta',
    'playing_phase_text2': 'A carta mais alta ganha a vaza (rodada)',
    'playing_phase_text3': 'O vencedor de cada vaza inicia a próxima',
    'playing_phase_text4': 'Cancelamento de Cartas: Se dois jogadores jogam cartas da mesma força, elas se cancelam',
    'scoring_rules': '3. Pontuação',
    'scoring_text1': 'Acerto Exato: Se você ganhar exatamente o que apostou, mantém todas as suas vidas',
    'scoring_text2': 'Erro na Aposta: Se você ganhar mais ou menos vazas do que apostou, perde 1 vida',
    'winning_elimination': '🏆 Vitória e Eliminação',
    'winning_text1': 'Quando você chega a 0 vidas, é eliminado',
    'winning_text2': 'O último jogador restante ganha o jogo!',
    'winning_text3': 'Os jogos ficam progressivamente mais difíceis conforme o número de cartas aumenta, depois diminui',
    'strategy_tips': '💡 Dicas de Estratégia',
    'strategy_tip1': 'Conte as Manilhas: Há 4 manilhas (uma por naipe) - acompanhe-as cuidadosamente',
    'strategy_tip2': 'Observe as Apostas: Use as apostas dos outros jogadores para estimar a força de suas mãos',
    'strategy_tip3': 'Memória de Cartas: Lembre-se de quais cartas altas já foram jogadas',
    'strategy_tip4': 'Vantagem do Último Jogador: O último jogador a apostar tem mais informações, mas também restrições',
    'special_rules': '👑 Regras Especiais',
    'special_rule1': 'Naipes da Manilha: Em empates, os naipes da manilha são classificados: ♣ (menor) → ♥ → ♠ → ♦ (maior)',
    'special_rule2': 'Cancelamento de Cartas: Cartas da mesma força se cancelam em pares conforme são jogadas',
    'special_rule3': 'Destaque da Coroa: A carta vencedora atual em cada vaza é destacada com uma coroa 👑',
    'pro_tip': '💡 Dica Profissional: Dedique tempo na fase de apostas! Seu sucesso depende de prever com precisão seu desempenho.',
    
    // Middle Card Workaround
    'all_cards_dealt': 'Todas 40 cartas distribuídas aos jogadores',
    
    // Error Messages
    'failed_to_create': 'Falha ao criar jogo',
    'failed_to_join': 'Falha ao entrar no jogo',
    'failed_to_connect': 'Falha ao conectar com o servidor do jogo',
    'connection_error': 'Erro de conexão. O jogo continua via conexão de backup.',
    'reconnecting': 'Reconectando...',
    'reconnected': 'Reconectado com sucesso',
    
    // Bug Report
    'report_bug': 'Reportar Bug',
    'describe_bug': 'Descreva o bug',
    'bug_description_placeholder': 'Por favor, descreva o que aconteceu, o que você esperava que acontecesse e quaisquer passos para reproduzir o problema...',
    'contact_info_optional': 'Informações de Contato (Opcional)',
    'contact_placeholder': 'E-mail ou outras informações de contato (opcional)',
    'game_info': 'Informações do Jogo',
    'cancel': 'Cancelar',
    'send_report': 'Enviar Relatório',
    'sending': 'Enviando...',
    'bug_report_sent': 'Relatório de Bug Enviado!',
    'bug_report_thanks': 'Obrigado por nos ajudar a melhorar o jogo!',
    
    // Card Sorting
    'sort_by_strength': 'Ordenar cartas por força (mais fraca primeiro)',
    'show_original_order': 'Mostrar ordem original das cartas',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<'en' | 'pt'>('en');

  // Load saved language preference
  useEffect(() => {
    const saved = localStorage.getItem('fodinha-language');
    if (saved === 'pt' || saved === 'en') {
      setLanguage(saved);
    }
  }, []);

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'pt' : 'en';
    setLanguage(newLang);
    localStorage.setItem('fodinha-language', newLang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[language][key as keyof typeof translations[typeof language]] || key;
    
    // Replace parameters like {{player}} with actual values
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
} 