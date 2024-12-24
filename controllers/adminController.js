const mediaIndex = (req, res)=> {
    res.render('admin/media', { mytitle: 'Admindashboard | Medie' })
}

const newsIndex = (req, res)=> {
    res.render('admin/news', { mytitle: 'Admindashboard | News'})
}

const employeeIndex = (req, res)=> {
    res.render('admin/employee', { mytitle: 'Admindashboard | Employee'})
}

const wasteTypeIndex = (req, res)=> {
    res.render('admin/wasteType', { mytitle: 'Admindashboard | WasteType'})
}

const wastePriceIndex = (req, res)=> {
    res.render('admin/wastePrice', { mytitle: 'Admindashboard | WasteType'})
}

const RoundIndex = (req, res)=> {
    res.render('admin/round', { mytitle: 'Admindashboard | Round'})
}
module.exports = {
    mediaIndex,
    newsIndex,
    employeeIndex,
    wasteTypeIndex,
    wastePriceIndex,
    RoundIndex
}