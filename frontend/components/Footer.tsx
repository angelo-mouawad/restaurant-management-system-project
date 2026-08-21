"use client";

import useI18n from "@hooks/useI18n";

const Footer: React.FC = () => {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-gray-800 py-4 text-center text-white shadow-inner">
      <p className="text-sm">{t("footer.copyright", { year })}</p>
    </footer>
  );
};

export default Footer;
