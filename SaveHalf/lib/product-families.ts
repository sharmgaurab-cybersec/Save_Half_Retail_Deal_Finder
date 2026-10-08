// Broad alternatives only. This never changes the same-product identity.
export function alternativeFamily(title:string):string|null{
 const t=title.toLowerCase();
 if(/(?:rolled|traditional|quick|porridge) oats|oats (?:rolled|quick|traditional)/.test(t))return /quick/.test(t)?'quick-oats':'rolled-oats';
 if(!/sauce|bake|kit|salad|ready meal/.test(t)&&/pasta|spaghetti|penne|fusilli|risoni|fettuccine|farfalle|rigatoni|elbows|lasagn|trivelle|conchiglie|casarecce|orecchiette|mafalde|ditali/.test(t))return /gluten.?free|lentil|edamame|konjac|slendier/.test(t)?'pasta-gluten-free':'dry-pasta';
 if(!/milk chocolate|milk biscuit|milk yogurt|milk yoghurt/.test(t)&&/milk/.test(t))return /powder/.test(t)?'milk-powder':/soy|rice|oat|almond/.test(t)?'plant-milk':'dairy-milk';
 if(!/cracker|cake|noodle|bran|pudding/.test(t)&&/rice/.test(t))return /cup|microwave|mwr|pouch|ben.?s? original|creamed/.test(t)?'prepared-rice':'dry-rice';
 if(/chickpea|baked beans|kidney beans|cannellini beans|butter beans/.test(t))return 'tinned-legumes';
 if(/yoghurt/.test(t))return 'yoghurt';
 if(/olive oil/.test(t))return 'olive-oil';
 if(/flour/.test(t))return 'flour';
 if(!/peanut|almond|cashew|butter chicken/.test(t)&&/butter/.test(t))return 'butter';
 if(/bread/.test(t))return 'bread';
 return null;
}
