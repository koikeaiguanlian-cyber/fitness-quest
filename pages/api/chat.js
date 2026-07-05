export default async function handler(req, res) {
     const response = await fetch('https://api.anthropic.com/v1/messages', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': process.env.ANTHROPIC_API_KEY,
       },
       body: JSON.stringify(req.body),
     });
     const data = await response.json();
     res.status(200).json(data);
   }
