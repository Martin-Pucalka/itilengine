# ITIL Engine

This web application was developed as a part of Master's thesis on Faculty of Information Technology Brno University of Technology.
The application can be used as a simulator of IT services, which is based on ITIL practises.
There are two main roles in the application: creator and player.
As a creator you can design your own IT service with custom properties, configuration items and so on.
Then you can specify scenario, which describes service's behaviour during its operation. 
This scenario can be created by workflow designer. 
Creating of the scenario includes definition of tickets and changes in service configuration.
As a player you can run this scenario, watch the service and it's key indicators, answer tickets and practise your ITIL skills!

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Node.js (npm is included)

```
https://nodejs.org/
```

MongoDB

```
https://www.mongodb.com/
```

### Installing

1. Clone repository

2. Go to project folder and install project dependencies by:

```
npm install
```

3. Set enviroment variables (replace "*" with values, see below) and run app by:

```
MAX_EMAILS_PER_MINUTE="*" NODEMAILER_SERVICE="*" NODEMAILER_USER="*" NODEMAILER_PASS="*" CLIENTID="*" CLIENTSECRET="*" HOSTNAME="*" PORT="*" DB="*" NODE_ENV="production" node bin/www
```

Enviroment variables: 

MAX_EMAILS_PER_MINUTE - max. email notifications sent to user per minute

NODEMAILER_SERVICE - nodemailer service used for sending email notification, see http://nodemailer.com/smtp/well-known/

NODEMAILER_USER - nodemailer username

NODEMAILER_PASS - nodemailer password

CLIENTID - google clientID. Used for Google authenticating, see https://cloud.google.com/nodejs/getting-started/authenticate-users

CLIENTSECRET - google clientSecret. Used for Google authenticating .

HOSTNAME - URL of application. Important for redirecting from emails.

PORT - port of application

DB - mongoDB connection string, see https://docs.mongodb.com/manual/reference/connection-string/


## License

This project is licensed under the BSD License - see the [LICENSE.md](LICENSE.md) file for details
