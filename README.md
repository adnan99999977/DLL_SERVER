# Digital Life Lessons – Backend

---

## About the Project

This backend powers the Digital Life Lessons platform. It handles **authentication**, **lesson management**, **premium access**, **Stripe payments**, and **admin moderation**. Built with scalability, security, and clean API design in mind.

---

## Key Features

- JWT verification using Firebase Admin SDK  
- User management (Free & Premium roles)  
- CRUD operations for life lessons  
- Premium access validation for protected routes  
- Stripe payment integration and webhook handling  
- Likes, favorites, comments, and report system  
- Admin moderation tools (manage users, lessons, and reports)  
- Search, filter, sort, and pagination for public lessons  

---

## Technologies Used

- Node.js & Express.js  
- MongoDB  
- Firebase Admin SDK  
- JWT for route protection  
- Stripe for payments  
- Cors & dotenv for security  

---

## Security & Deployment

- Environment variables secure credentials  
- Token verification on all protected routes  
- Role-based access control (User/Admin)  
- Vercel deployment with reload-safe routes  
- Stripe test mode enabled  

---

## Database Collections

- users  
- lessons  
- favorites  
- comments  
- lessonReports  
- payments  

