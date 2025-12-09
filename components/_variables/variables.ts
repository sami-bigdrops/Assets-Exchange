export interface AppVariables {
  logo: {
    path: string;
    alt: string;
  };

  favicon: {
    path: string;
    alt: string;
  };
  colors: {
    background: string;
    cardBackground: string;
    titleColor: string;
    labelColor: string;
    descriptionColor: string;
    accent: string;
    inputBackgrounColor: string;
    inputDisabledColor: string;
    inputTextColor: string;
    inputPlaceholderColor: string;
    inputBorderColor: string;
    inputBorderFocusColor: string;
    inputErrorColor: string;
    inputBorderDisabledColor: string;
    inputRingColor: string;
    buttonDefaultBackgroundColor: string;
    buttonDefaultTextColor: string;
    buttonOutlineBackgroundColor: string;
    buttonOutlineBorderColor: string;
    buttonOutlineTextColor: string;
    buttonDisabledBackgroundColor: string;
    buttonDisabledTextColor: string;
    buttonHoverBackgroundColor: string;
    buttonHoverTextColor: string;
  };
  branding: {
    appName: string;
    companyName: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
  };
}

export const defaultVariables: AppVariables = {
  logo: {
    path: "/logo.svg",
    alt: "Big Drops Marketing Group Logo",
  },
  favicon: {
    path: "/favicon.png",
    alt: "Big Drops Marketing Group Favicon",
  },
  colors: {
    background: "#EFF8FF",
    cardBackground: "#FFFFFF",
    titleColor: "#2c91cc",
    labelColor: "#2c91cc",
    descriptionColor: "#6b7280",
    inputBackgrounColor: "#FFFFFF",
    inputDisabledColor: "#999999",
    inputTextColor: "#010101",
    inputPlaceholderColor: "#6b7280",
    inputBorderColor: "#999999",
    inputBorderFocusColor: "#2c91cc",
    inputErrorColor: "#FF0000",
    inputBorderDisabledColor: "#999999",
    inputRingColor: "#2c91cc",
    buttonDefaultBackgroundColor: "#2c91cc",
    buttonDefaultTextColor: "#FFFFFF",
    buttonOutlineBackgroundColor: "transparent",
    buttonOutlineBorderColor: "#2c91cc",
    buttonOutlineTextColor: "#2c91cc",
    buttonDisabledBackgroundColor: "#999999",
    buttonDisabledTextColor: "#FFFFFF",
    buttonHoverBackgroundColor: "#2c91cc",
    buttonHoverTextColor: "#FFFFFF",
    accent: "#3b82f6",
  },
  branding: {
    appName: "Big Drops Marketing Group",
    companyName: "Big Drops Marketing Group",
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    headingFont: "Plus Jakarta Sans, sans-serif",
  },
};

export const getVariables = (): AppVariables => {
  return defaultVariables;
};
