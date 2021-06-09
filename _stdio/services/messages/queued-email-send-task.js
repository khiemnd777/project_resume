const { isArray } = require("../../shared/utils");
const EmailSender = require("../messages/email-sender");
const marked = require("marked");

module.exports = {
  async execute() {
    const maxSendTries = 3;
    const queuedEmailService = strapi.services["queued-email"];
    const queuedEmails = await queuedEmailService.searchEmails(
      null, // from,
      null, // to,
      true, // loadNotSentItemsYetOnly,
      maxSendTries, // maxSendTries,
      true, // loadNewest,
      0, // pageIndex,
      500, // pageSize
    );
    if (isArray(queuedEmails)) {
      const emailSender = new EmailSender()
      queuedEmails.forEach(async (email) => {
        try {
          const htmlBody = marked(email.Body);
          await emailSender.sendEmail(
            !!email.EmailAccount ? email.EmailAccount.id : null,
            email.Subject,
            htmlBody,
            email.From,
            email.FromName,
            email.To,
            email.ToName,
            email.Cc,
            email.Bcc
          );
          email.SentOn = new Date();
        } catch {
          if(!email.SendTries){
            email.SendTries = 0;
          }
          email.SendTries += 1;
        } finally {
          await queuedEmailService.updateQueuedEmail(
            { id: email.id },
            {
              SentOn: email.SentOn,
              SendTries: email.SendTries
            }
          );
        }
      });
    }
  }
};
