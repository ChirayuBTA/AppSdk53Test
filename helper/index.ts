const queryString = (query: any) =>
  Object.keys(query)
    .map((key) => {
      const value = Array.isArray(query[key])
        ? query[key].join(",")
        : query[key];
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join("&");

const formDataToObject = (formData: any, name?: string) => {
  const obj = Object.fromEntries(formData.entries());
  const label = name ? `${name} ` : "";
  console.log(`${label}formData as object:`, obj);
  return obj;
};

export { queryString, formDataToObject };
