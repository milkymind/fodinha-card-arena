import { useLanguage } from '../../contexts/LanguageContext';
import styles from '../styles/LanguageToggle.module.css';

export default function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={styles.languageToggle}
      title={language === 'en' ? 'Switch to Portuguese' : 'Mudar para Inglês'}
    >
      <span className={styles.flag}>
        {language === 'en' ? '🇧🇷' : '🇺🇸'}
      </span>
      <span className={styles.langText}>
        {language === 'en' ? 'PT' : 'EN'}
      </span>
    </button>
  );
} 