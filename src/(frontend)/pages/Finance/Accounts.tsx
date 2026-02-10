import React, { useState } from 'react';
import CompanyAccounts from './CompanyAccounts';
import CompanyAccountDetail from './CompanyAccountDetail';

const Accounts: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleViewAccount = (companyId: string, companyName: string) => {
    setSelectedCompany({ id: companyId, name: companyName });
  };

  const handleBack = () => {
    setSelectedCompany(null);
  };

  if (selectedCompany) {
    return (
      <CompanyAccountDetail
        companyId={selectedCompany.id}
        companyName={selectedCompany.name}
        onBack={handleBack}
      />
    );
  }

  return <CompanyAccounts onViewAccount={handleViewAccount} />;
};

export default Accounts;
