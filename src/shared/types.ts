export type Rule = {
  id: string;
  urlPattern: string;
  cssSelector: string;
};

export type RuleGroup = {
  id: string;
  prompt: string;
  isDefault?: boolean;
  cssSelector?: string;
  rules: Rule[];
};

export type RuleConfig = {
  ruleGroups: RuleGroup[];
};

export type MatchedGroup = {
  prompt: string;
  cssSelector: string;
};
