const mediaIndex = (req, res)=> {
    res.render('admin/media', { mytitle: 'Admindashboard | Medie' })
}

const newsIndex = (req, res)=> {
    res.render('admin/news', { mytitle: 'Admindashboard | News'})
}

const employeeIndex = (req, res)=> {
    res.render('admin/employee', { mytitle: 'Admindashboard | Employee'})
}
module.exports = {
    mediaIndex,
    newsIndex,
    employeeIndex
}