const LocalStrategy = require("passport-local").Strategy
const bcrypt = require("bcrypt")
const { User } = require("./models")

function initialize(passport) {
  const authenticateUser = async (username, password, done) => {
    try {
      const user = await User.findOne({ where: { username } })
      if (!user) {
        return done(null, false, { message: "No user with this username" })
      }

      if (await bcrypt.compare(password, user.password)) {
        return done(null, user)
      } else {
        return done(null, false, { message: "Password incorrect" })
      }
    } catch (e) {
      return done(e)
    }
  }
  passport.use(
    new LocalStrategy({ usernameField: "username" }, authenticateUser)
  )

  passport.serializeUser((user, done) => done(null, user.username))
  passport.deserializeUser(async (username, done) => {
    try {
      const user = await User.findByPk(username)
      done(null, user)
    } catch (e) {
      done(e)
    }
  })
}

module.exports = initialize
