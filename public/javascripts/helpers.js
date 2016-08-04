exports.formatAddress = (address) => {
  return address ? address.replace(/\d{5}, USA$/, '') : 'Unknown Address';
};

exports.formatPhone = (phone) => {
  return (phone || '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
};
