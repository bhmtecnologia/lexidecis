<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>LexiChat</title>
  <!-- other head elements -->
</head>
<body>
  <!-- other body content -->

  <div id="content"></div>

  <!-- other body content -->

  <script type="module">
    import AuthService from "../js/auth.js";
    import { getUserProfile } from "../js/api.js";
    import { buildSidebarMenu } from "../assets/js/menu-builder.js";
    import { renderHome } from "../js/home.js";

    AuthService.onAuthChange(async (user) => {
      if (user) {
        const profile = await getUserProfile(user.uid);
        buildSidebarMenu(profile);

        // Render home view initially
        renderHome();

        // other code such as router() or showing page
      } else {
        // handle no user logged in
      }
    });

    // other script code
  </script>
</body>
</html>