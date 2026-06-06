import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
const resources = {
  en: {
    translation: {
      "login": "Login", "email": "Email", "password": "Password",
      "register": "Register", "name": "Name", "role": "Role",
      "client": "Client", "vendor": "Vendor", "admin": "Admin",
      "dashboard": "Dashboard", "orders": "Orders", "menu": "Menu",
      "tables": "Tables", "users": "Users", "stats": "Stats",
      "history": "History", "pending": "Pending", "confirmed": "Confirmed",
      "ready": "Ready", "delivered": "Delivered", "refused": "Refused",
      "logout": "Logout", "addTable": "Add Table", "add": "Add",
      "cancel": "Cancel", "success": "Success", "error": "Error",
      "free": "Free", "occupied": "Occupied", "waiting": "Waiting",
      "availability": "Availability", "changeAvailability": "Change availability",
    }
  },
  fr: {
    translation: {
      "login": "Connexion", "email": "Email", "password": "Mot de passe",
      "register": "S'inscrire", "name": "Nom", "role": "Rôle",
      "client": "Client", "vendor": "Vendeur", "admin": "Admin",
      "dashboard": "Tableau de bord", "orders": "Commandes", "menu": "Menu",
      "tables": "Tables", "users": "Utilisateurs", "stats": "Statistiques",
      "history": "Historique", "pending": "En attente", "confirmed": "Confirmé",
      "ready": "Prêt", "delivered": "Livré", "refused": "Refusé",
      "logout": "Déconnexion", "addTable": "Ajouter table", "add": "Ajouter",
      "cancel": "Annuler", "success": "Succès", "error": "Erreur",
      "free": "Libre", "occupied": "Occupé", "waiting": "En attente",
      "availability": "Disponibilité", "changeAvailability": "Changer disponibilité",
    }
  },
  ar: {
    translation: {
      "login": "تسجيل الدخول", "email": "البريد الإلكتروني", "password": "كلمة المرور",
      "register": "تسجيل", "name": "الاسم", "role": "الدور",
      "client": "عميل", "vendor": "بائع", "admin": "مسؤول",
      "dashboard": "لوحة القيادة", "orders": "الطلبات", "menu": "القائمة",
      "tables": "الطاولات", "users": "المستخدمين", "stats": "الإحصائيات",
      "history": "السجل", "pending": "قيد الانتظار", "confirmed": "مؤكد",
      "ready": "جاهز", "delivered": "تم التوصيل", "refused": "مرفوض",
      "logout": "تسجيل الخروج", "addTable": "إضافة طاولة", "add": "إضافة",
      "cancel": "إلغاء", "success": "نجاح", "error": "خطأ",
      "free": "حر", "occupied": "مشغول", "waiting": "انتظار",
      "availability": "التوفر", "changeAvailability": "تغيير التوفر",
    }
  }
};
i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('lang') || 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }
});
export default i18n;
