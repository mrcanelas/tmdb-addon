export interface AgeRating {
  id: string;
  name: string;
  description: string;
  order: number;
  badge: {
    text: string;
    color: string;
  };
}

export const ageRatings: AgeRating[] = [
  {
    id: "NONE",
    name: "No Restriction",
    description: "Show all content without age restrictions",
    order: 0,
    badge: {
      text: "ALL",
      color: "bg-gray-500"
    }
  },
  {
    id: "G",
    name: "General Audience",
    description: "All ages admitted. There is no content that would be objectionable to most parents.",
    order: 1,
    badge: {
      text: "G",
      color: "bg-green-500"
    }
  },
  {
    id: "PG",
    name: "Parental Guidance",
    description: "Some material may not be suitable for children under 10. May contain mild language, crude/suggestive humor, scary moments and/or violence.",
    order: 2,
    badge: {
      text: "PG",
      color: "bg-blue-500"
    }
  },
  {
    id: "PG-13",
    name: "Parental Guidance 13",
    description: "Some material may be inappropriate for children under 13. May contain sexual content, brief nudity, strong language, mature themes and intense action violence.",
    order: 3,
    badge: {
      text: "PG-13",
      color: "bg-yellow-500"
    }
  },
  {
    id: "R",
    name: "Restricted",
    description: "Under 17 requires accompanying parent or adult guardian. May contain strong profanity, graphic sexuality, nudity, strong violence, horror, gore, and drug use.",
    order: 4,
    badge: {
      text: "R",
      color: "bg-red-500"
    }
  },
  {
    id: "NC-17",
    name: "Adults Only",
    description: "Adults only. Contains excessive graphic violence, intense sex, depraved behavior, explicit drug abuse or any other elements beyond R rating.",
    order: 5,
    badge: {
      text: "NC-17",
      color: "bg-purple-500"
    }
  }
];

ageRatings.sort((a, b) => a.order - b.order); 