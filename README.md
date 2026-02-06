# Inventory Management System

## Overview

This project is a self-developed inventory management system with a Python Flask backend and a JavaScript-based frontend. It is designed to manage inventory items, user permissions, and event-based item usage in a structured and reliable way.  
While the content of the inventory management system is presently in German, an English version will be provided soon.  
  
The Backend with Python Flask handles data storage, user authentication, and permissions. It provides API endpoints for inventory items, users, and events.
The Frontend with JavaScript communicates with the backend via HTTP requests (API calls) and provides an interactive user interface for managing inventory and events.


## Features

- **Inventory Management**  
    - Create, update, and delete inventory items  
    - Track quantities and item details  
    - Maintain an up-to-date overview of current stock  

- **User Management & Permissions**
    - Support for multiple users  
    - Role-based access control  
    - Restricted actions based on user roles (e.g. admin vs. regular user)  

- **Event Management**
    - Create and manage events  
    - Assign inventory items to specific events  
    - Automatically reflect item usage in stock availability  
    - Ensures accurate inventory tracking by linking events with item usage  
    - Prevents conflicts by keeping stock information synchronized between events and inventory  

## Purpose
The purpose of this project is to provide a practical and extensible solution for inventory control combined with event planning. By using Python Flask for the backend and JavaScript for the frontend, the system separates logic and presentation, making it maintainable and easy to extend.

## Technologies Used:
- Python 
- Flask
- JavaScript
- HTML / CSS
- REST API