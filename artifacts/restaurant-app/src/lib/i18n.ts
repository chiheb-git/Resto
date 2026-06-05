import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "login": "Login",
      "email": "Email",
      "password": "Password",
      "register": "Register",
      "name": "Name",
      "role": "Role",
      "client": "Client",
      "vendor": "Vendor",
      "admin": "Admin",
      "dashboard": "Dashboard",
      "orders": "Orders",
      "menu": "Menu",
      "tables": "Tables",
      "users": "Users",
      "stats": "Stats",
      "history": "History",
      "pending": "Pending",
      "confirmed": "Confirmed",
      "ready": "Ready",
      "delivered": "Delivered",
      "refused": "Refused",
      "logout": "Logout",
    }
  },
  fr: {
    translation: {
      "login": "Connexion",
      "email": "Email",
      "password": "Mot de passe",
      "register": "S'inscrire",
      "name": "Nom",
      "role": "Rôle",
      "client": "Client",
      "vendor": "Vendeur",
      "admin": "Admin",
      "dashboard": "Tableau de bord",
      "orders": "Commandes",
      "menu": "Menu",
      "tables": "Tables",
      "users": "Utilisateurs",
      "stats": "Statistiques",
      "history": "Historique",
      "pending": "En attente",
      "confirmed": "Confirmé",
      "ready": "Prêt",
      "delivered": "Livré",
      "refused": "Refusé",
      "logout": "Déconnexion",
    }
  },
  ar: {
    translation: {
      "login": "تسجيل الدخول",
      "email": "البريد الإلكتروني",
      "password": "كلمة المرور",
      "register": "تسجيل",
      "name": "الاسم",
      "role": "الدور",
      "client": "عميل",
      "vendor": "بائع",
      "admin": "مسؤول",
      "dashboard": "لوحة القيادة",
      "orders": "الطلبات",
      "menu": "القائمة",
      "tables": "الطاولات",
      "users": "المستخدمين",
      "stats": "الإحصائيات",
      "history": "السجل",
      "pending": "قيد الانتظار",
      "confirmed": "مؤكد",
      "ready": "جاهز",
      "delivered": "تم التوصيل",
      "refused": "مرفوض",
      "logout": "تسجيل الخروج",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') || 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
