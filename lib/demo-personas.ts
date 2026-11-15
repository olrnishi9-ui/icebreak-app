// Fictional examples loaded only by an explicit choice in an organiser-created
// demo event. They never create Auth users or pretend to be real attendees.
export const demoPersonas = [
  {
    name: "Alex Morgan",
    role: "Product designer",
    organization: "Common Ground (demo)",
    industry: "Technology",
    expertise: "Product design",
    introduction: "I design tools that bring people together.",
    interests: ["AI", "Design"],
    goals: ["Find collaborators"],
    offer: "Product design",
    lookingFor: "Customer research",
  },
  {
    name: "Maya Chen",
    role: "User researcher",
    organization: "Field Notes (demo)",
    industry: "Technology",
    expertise: "Customer research",
    introduction: "I help teams understand what people need before they build.",
    interests: ["Design", "Research"],
    goals: ["Find collaborators", "Learn from experts"],
    offer: "Customer research",
    lookingFor: "Product design",
  },
] as const;
