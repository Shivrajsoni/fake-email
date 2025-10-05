-  We will use mailin to handle the SMTP protocol and mail-parser to handle the email content. This lets
  us focus on our application's business logic, not on reinventing a very complex and solved problem.
 Here's why using a library like mail-parser is the industry-standard best practice:

   * MIME Complexity: Modern emails are not just plain text. They use a format called MIME (Multipurpose Internet
     Mail Extensions). This involves handling dozens of edge cases:
       * Encodings: Text can be encoded in Base64 or Quoted-Printable.
       * Character Sets: You need to handle various character sets (UTF-8, ISO-8859-1, etc.).
       * Multipart Messages: Emails often contain both a plain text and an HTML version.
       * Attachments: Files are embedded within the email body in a specific format.
       * Headers: Email headers can be folded, encoded, and have many non-standard variations.
   * Security: Incorrectly parsing a complex format like MIME can open your application to security vulnerabilities,
     such as denial-of-service attacks or buffer overflows.
   * Maintenance: A manual parser would be a massive, brittle piece of code to write and maintain.


- A Webhook would be ideal for Notifing New Email recieved Status 


## Todo 
- More Robust Parser Logic Implementation for SMTP 
- Function to add into DB .
- API Route to fetch preview / and single email 
- Webhook to live transmission for Notification of New Email recieved
